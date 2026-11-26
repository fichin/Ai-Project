import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { PGlite } from '@electric-sql/pglite'

const baselineUrl = new URL('../../migrations/0001_baseline.sql', import.meta.url)

const EXPECTED_TABLES = [
  'activity_events',
  'agents',
  'conversations',
  'dev_outbox_emails',
  'email_verification_tokens',
  'messages',
  'notifications',
  'password_reset_tokens',
  'projects',
  'sessions',
  'user_preferences',
  'users',
]

async function tableNames(db) {
  const { rows } = await db.query(
    `SELECT table_name FROM information_schema.tables
     WHERE table_schema = 'public' ORDER BY table_name`,
  )
  return rows.map((row) => row.table_name)
}

test('0001_baseline builds the full schema on an empty database', async () => {
  const db = new PGlite()
  try {
    await db.exec(await readFile(baselineUrl, 'utf8'))

    assert.deepEqual(await tableNames(db), EXPECTED_TABLES)

    // Spot-check that constraints came through, not just the tables.
    await assert.rejects(
      db.query(`INSERT INTO projects (user_id, name, status) VALUES (1, 'x', 'active')`),
      /foreign key/,
    )
  } finally {
    await db.close()
  }
})
