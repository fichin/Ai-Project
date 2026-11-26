import { test, before, after, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { PGlite } from '@electric-sql/pglite'
import { baseline, compareSchemas, describeSchema, expectedSchemaFor, loadMigrations, migrate } from './migrator.js'

const EXPECTED_TABLES = [
  'activity_events',
  'agents',
  'conversations',
  'email_verification_tokens',
  'messages',
  'notifications',
  'password_reset_tokens',
  'projects',
  'sessions',
  'user_preferences',
  'users',
]

let db
let all
let baselineSql

before(async () => {
  db = new PGlite()
  all = await loadMigrations()
  baselineSql = all.find((m) => m.name === '0001_baseline.sql').sql
})

after(async () => {
  await db.close()
})

beforeEach(async () => {
  await db.exec('DROP SCHEMA public CASCADE; CREATE SCHEMA public;')
})

async function tableNames() {
  const { rows } = await db.query(
    `SELECT table_name FROM information_schema.tables
     WHERE table_schema = 'public' AND table_name <> 'schema_migrations' ORDER BY table_name`,
  )
  return rows.map((row) => row.table_name)
}

test('npm run migrate on an empty database builds the full current schema', async () => {
  await migrate(db, all)

  assert.deepEqual(await tableNames(), EXPECTED_TABLES)
  const { rows } = await db.query(`
    SELECT count(*)::int AS n FROM information_schema.columns
    WHERE table_schema = 'public' AND column_name LIKE '%\\_at' AND data_type <> 'timestamp with time zone'`)
  assert.equal(rows[0].n, 0, 'every *_at column is timestamptz')

  // Constraints came through, not just the tables.
  await assert.rejects(
    db.query(`INSERT INTO projects (user_id, name, status) VALUES (1, 'x', 'active')`),
    /foreign key/,
  )
})

test('a hand-built database: baseline records 0001 without running it, then migrate runs the rest', async () => {
  // What production looks like today: 0001 pasted in by hand, no tracking.
  await db.exec(baselineSql)
  await db.exec(`INSERT INTO users (email, name) VALUES ('ada@example.com', 'Ada')`)
  assert.deepEqual(compareSchemas(await expectedSchemaFor(all.slice(0, 1)), await describeSchema(db)), {
    missing: [],
    unexpected: [],
  })

  await baseline(db, all)
  const result = await migrate(db, all)

  assert.deepEqual(result.applied, ['0002_timestamptz.sql', '0003_drop_dev_outbox_emails.sql'])
  const { rows } = await db.query('SELECT count(*)::int AS n FROM users')
  assert.equal(rows[0].n, 1, 'existing data survived')
  assert.deepEqual(await tableNames(), EXPECTED_TABLES)
})

test('baseline refuses an empty database and an already tracked one', async () => {
  await assert.rejects(baseline(db, all), /empty: run the migrations/)

  await migrate(db, all)
  await assert.rejects(baseline(db, all), /already tracks migrations/)
})

test('schema drift on a hand-built database is detected before baselining', async () => {
  await db.exec(baselineSql)
  await db.exec('ALTER TABLE users DROP COLUMN avatar_id')

  const drift = compareSchemas(await expectedSchemaFor(all.slice(0, 1)), await describeSchema(db))

  assert.deepEqual(drift.missing, ['users.avatar_id text'])
})
