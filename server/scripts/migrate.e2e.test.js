import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { fileURLToPath } from 'node:url'
import { PGlite } from '@electric-sql/pglite'
import { PGLiteSocketServer } from '@electric-sql/pglite-socket'
import { loadMigrations } from '../src/db/migrator.js'

// The production runbook, step by step, through the real CLI and the real pg
// driver, against a database built by hand the way production was.
const run = promisify(execFile)
const script = fileURLToPath(new URL('./migrate.js', import.meta.url))
const port = 55000 + Math.floor(Math.random() * 5000)
const env = { ...process.env, DATABASE_URL: `postgres://postgres@127.0.0.1:${port}/postgres` }

let db
let server

async function cli(...args) {
  const { stdout } = await run(process.execPath, [script, ...args], { env })
  return stdout
}

async function columnType(table, column) {
  const { rows } = await db.query(
    'SELECT data_type FROM information_schema.columns WHERE table_name = $1 AND column_name = $2',
    [table, column],
  )
  return rows[0]?.data_type
}

before(async () => {
  db = new PGlite()
  const [baseline] = await loadMigrations()
  await db.exec(baseline.sql)
  await db.exec(`INSERT INTO users (email, name, created_at, updated_at)
                 VALUES ('ada@example.com', 'Ada', '2026-11-26 10:00:00', '2026-11-26 10:00:00')`)
  // Like production: one agent has a persona from the unmerged WIP branch.
  await db.exec(`INSERT INTO agents (user_id, name, persona) VALUES (1, 'Helper', 'Be brief.')`)
  server = new PGLiteSocketServer({ db, port, host: '127.0.0.1' })
  await server.start()
})

after(async () => {
  await server.stop()
  await db.close()
})

test('check, baseline, dry run, migrate, check again', async () => {
  const firstCheck = await cli('--check')
  assert.match(firstCheck, /Applied: none \(not tracked yet\)/)
  assert.match(firstCheck, /Pending: 0001_baseline\.sql, 0002_timestamptz\.sql, 0003_drop_dev_outbox_emails\.sql/)
  assert.match(firstCheck, /Schema matches 0001_baseline\.sql\./)

  assert.match(await cli('--baseline', '--yes'), /Recorded 0001_baseline\.sql as applied/)

  const dryRun = await cli('--dry-run')
  assert.match(dryRun, /Dry run, rolled back\. Would apply: 0002_timestamptz\.sql, 0003_drop_dev_outbox_emails\.sql/)
  assert.match(dryRun, /users: 1 -> 1\n/)
  assert.match(dryRun, /agents: 1 -> 1\n/)
  assert.match(dryRun, /dev_outbox_emails: 0 -> dropped/)
  assert.doesNotMatch(dryRun, /CHANGED/)
  assert.equal(await columnType('users', 'created_at'), 'text', 'the dry run left the database untouched')

  assert.match(await cli('--yes'), /Applied: 0002_timestamptz\.sql, 0003_drop_dev_outbox_emails\.sql/)
  assert.equal(await columnType('users', 'created_at'), 'timestamp with time zone')
  const { rows } = await db.query('SELECT created_at FROM users')
  assert.equal(rows[0].created_at.toISOString(), '2026-11-26T10:00:00.000Z')
  const agents = await db.query('SELECT persona FROM agents')
  assert.deepEqual(agents.rows, [{ persona: 'Be brief.' }], 'the persona value survived')

  const lastCheck = await cli('--check')
  assert.match(lastCheck, /Pending: none/)
  assert.match(lastCheck, /Schema matches 0003_drop_dev_outbox_emails\.sql\./)

  assert.match(await cli('--yes'), /Already up to date\./)
})
