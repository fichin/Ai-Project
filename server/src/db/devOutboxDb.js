import { DatabaseSync } from 'node:sqlite'
import { existsSync, mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import { env } from '../config/env.js'

// Minimal, standalone SQLite connection for the dev-only email outbox (see
// services/mail/providers/logProvider.js and routes/dev.routes.js) — a
// local development convenience that lets verification/reset links be
// retrieved without a real mail provider. Deliberately kept separate from
// the app's real database (Postgres/Supabase, see postgresClient.js): this
// is never written to in production and isn't worth migrating, so it keeps
// its own tiny SQLite file with just the one table it needs.
let db = null

function createConnection() {
  const dir = dirname(env.devOutboxDbPath)
  if (dir && !existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }

  const connection = new DatabaseSync(env.devOutboxDbPath)
  connection.exec(`
    CREATE TABLE IF NOT EXISTS dev_outbox_emails (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      to_email TEXT NOT NULL,
      subject TEXT NOT NULL,
      body TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_dev_outbox_emails_to_email ON dev_outbox_emails (to_email);
  `)

  return connection
}

export function getDevOutboxDb() {
  if (!db) {
    db = createConnection()
  }
  return db
}
