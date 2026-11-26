import { test, before, after, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { PGlite } from '@electric-sql/pglite'
import { loadMigrations, migrate } from './migrator.js'

const OLD = '2026-11-26 10:00:00'
const OLD_AS_ISO = '2026-11-26T10:00:00.000Z'
const LATER = '2026-12-03 10:00:00'

let db
let all

before(async () => {
  db = new PGlite()
  all = await loadMigrations()
})

after(async () => {
  await db.close()
})

beforeEach(async () => {
  await db.exec('DROP SCHEMA public CASCADE; CREATE SCHEMA public; RESET TimeZone;')
})

function upTo(name) {
  return all.filter((m) => m.name <= name)
}

// Rows written the way the old code did: UTC text, one or more per table.
async function seedOldTextRows() {
  await db.exec(`
    INSERT INTO users (email, name, email_verified_at, created_at, updated_at)
      VALUES ('a@example.com', 'A', '${OLD}', '${OLD}', '${OLD}');
    INSERT INTO users (email, name, created_at, updated_at)
      VALUES ('b@example.com', 'B', '${OLD}', '${OLD}');
    INSERT INTO sessions (id, user_id, created_at, expires_at) VALUES ('s', 1, '${OLD}', '${LATER}');
    INSERT INTO email_verification_tokens (id, user_id, created_at, expires_at) VALUES ('e', 1, '${OLD}', '${LATER}');
    INSERT INTO password_reset_tokens (id, user_id, created_at, expires_at) VALUES ('p', 1, '${OLD}', '${LATER}');
    INSERT INTO projects (user_id, name, created_at, updated_at) VALUES (1, 'P', '${OLD}', '${OLD}');
    INSERT INTO agents (user_id, name, created_at, updated_at) VALUES (1, 'G', '${OLD}', '${OLD}');
    INSERT INTO conversations (user_id, created_at, updated_at) VALUES (1, '${OLD}', '${OLD}');
    INSERT INTO messages (conversation_id, role, content, created_at) VALUES (1, 'user', 'hi', '${OLD}');
    INSERT INTO activity_events (user_id, type, created_at) VALUES (1, 'project_created', '${OLD}');
    INSERT INTO notifications (user_id, type, read_at, created_at) VALUES (1, 'project_created', '${OLD}', '${OLD}');
    INSERT INTO notifications (user_id, type, created_at) VALUES (1, 'project_created', '${OLD}');
    INSERT INTO user_preferences (user_id, updated_at) VALUES (1, '${OLD}');
  `)
}

async function timestampColumns() {
  const { rows } = await db.query(`
    SELECT table_name, column_name, data_type, column_default
    FROM information_schema.columns
    WHERE table_schema = 'public' AND column_name LIKE '%\\_at' AND table_name <> 'schema_migrations'
    ORDER BY table_name, column_name`)
  return rows
}

test('converts all 20 timestamp columns, except the table 0003 drops', async () => {
  await migrate(db, upTo('0002_timestamptz.sql'))

  const columns = (await timestampColumns()).filter((c) => c.table_name !== 'dev_outbox_emails')
  assert.equal(columns.length, 20)
  for (const column of columns) {
    assert.equal(column.data_type, 'timestamp with time zone', `${column.table_name}.${column.column_name}`)
  }
})

test('old UTC text keeps the same instant even when the session is not on UTC', async () => {
  await migrate(db, upTo('0001_baseline.sql'))
  await seedOldTextRows()
  // Supabase runs on UTC, so a cast that silently used the session zone would
  // look fine in production. Skopje is UTC+1 in November: a wrong cast shows.
  await db.exec(`SET TimeZone = 'Europe/Skopje'`)

  await migrate(db, upTo('0002_timestamptz.sql'))

  const { rows } = await db.query('SELECT created_at, email_verified_at FROM users ORDER BY id')
  assert.ok(rows[0].created_at instanceof Date)
  assert.equal(rows[0].created_at.toISOString(), OLD_AS_ISO)
  assert.equal(rows[0].email_verified_at.toISOString(), OLD_AS_ISO)
  assert.equal(rows[1].email_verified_at, null)

  const session = await db.query('SELECT expires_at FROM sessions')
  assert.equal(session.rows[0].expires_at.toISOString(), '2026-12-03T10:00:00.000Z')

  const unread = await db.query('SELECT count(*)::int AS n FROM notifications WHERE read_at IS NULL')
  assert.equal(unread.rows[0].n, 1)
})

test('new rows get now() as their default', async () => {
  await migrate(db, upTo('0002_timestamptz.sql'))

  const before = Date.now()
  const { rows } = await db.query(
    `INSERT INTO users (email, name) VALUES ('c@example.com', 'C') RETURNING created_at, updated_at`,
  )

  assert.ok(Math.abs(rows[0].created_at.getTime() - before) < 5_000)
  assert.ok(rows[0].updated_at instanceof Date)
})

test('the hand-run down file restores the original text values', async () => {
  await migrate(db, upTo('0001_baseline.sql'))
  await seedOldTextRows()
  await migrate(db, upTo('0002_timestamptz.sql'))
  await db.exec(`SET TimeZone = 'Europe/Skopje'`)

  const down = await readFile(new URL('../../migrations/down/0002_timestamptz.down.sql', import.meta.url), 'utf8')
  await db.exec(down)

  const columns = (await timestampColumns()).filter((c) => c.table_name !== 'dev_outbox_emails')
  assert.ok(columns.every((c) => c.data_type === 'text'))
  const { rows } = await db.query('SELECT created_at, email_verified_at FROM users ORDER BY id')
  assert.deepEqual(rows[0], { created_at: OLD, email_verified_at: OLD })
  assert.equal(rows[1].email_verified_at, null)
  const session = await db.query('SELECT expires_at FROM sessions')
  assert.equal(session.rows[0].expires_at, LATER)
})
