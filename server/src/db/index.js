import { DatabaseSync } from 'node:sqlite'
import { existsSync, mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import { env } from '../config/env.js'
import { SCHEMA_SQL } from './schema.js'
import { hashPassword } from '../utils/passwordHash.js'
import { DEV_USER_EMAIL, DEV_USER_MIGRATION_PASSWORD } from '../config/auth.js'

let db = null

// CREATE TABLE IF NOT EXISTS won't retrofit new columns onto a database file
// that already existed before this column was introduced — patch it in
// manually so upgrading in place doesn't require deleting local data.
function ensureUsersPasswordColumn(connection) {
  const columns = connection.prepare('PRAGMA table_info(users)').all()
  const hasPasswordHash = columns.some((column) => column.name === 'password_hash')
  if (!hasPasswordHash) {
    connection.exec('ALTER TABLE users ADD COLUMN password_hash TEXT')
  }
}

// Pre-auth data (Projects/Agents/Conversations from earlier phases) was
// created under a fixed placeholder user. Give that row a password once so
// it stays reachable through a real login instead of becoming orphaned.
function ensureDevUserPassword(connection) {
  const row = connection.prepare('SELECT id, password_hash FROM users WHERE email = ?').get(DEV_USER_EMAIL)
  if (row && !row.password_hash) {
    const passwordHash = hashPassword(DEV_USER_MIGRATION_PASSWORD)
    connection.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(passwordHash, row.id)
  }
}

// Same retrofit pattern as password_hash above, for email verification.
function ensureUsersEmailVerifiedColumn(connection) {
  const columns = connection.prepare('PRAGMA table_info(users)').all()
  const hasColumn = columns.some((column) => column.name === 'email_verified_at')
  if (!hasColumn) {
    connection.exec('ALTER TABLE users ADD COLUMN email_verified_at TEXT')
    // Grandfather in accounts that already existed before email verification
    // was introduced — this only runs the instant the column is added, never
    // again afterward, so newly registered (genuinely unverified) users are
    // unaffected on future restarts.
    connection.exec("UPDATE users SET email_verified_at = datetime('now') WHERE password_hash IS NOT NULL")
  }
}

// Same retrofit pattern again, for the profile avatar picker. NULL just
// means "no avatar chosen yet" — the UI falls back to initials.
function ensureUsersAvatarColumn(connection) {
  const columns = connection.prepare('PRAGMA table_info(users)').all()
  const hasColumn = columns.some((column) => column.name === 'avatar_id')
  if (!hasColumn) {
    connection.exec('ALTER TABLE users ADD COLUMN avatar_id TEXT')
  }
}

function createConnection() {
  const dir = dirname(env.dbPath)
  if (dir && !existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }

  const connection = new DatabaseSync(env.dbPath)
  connection.exec('PRAGMA foreign_keys = ON')
  connection.exec('PRAGMA journal_mode = WAL')
  connection.exec(SCHEMA_SQL)
  ensureUsersPasswordColumn(connection)
  ensureUsersEmailVerifiedColumn(connection)
  ensureUsersAvatarColumn(connection)
  ensureDevUserPassword(connection)

  return connection
}

export function getDb() {
  if (!db) {
    db = createConnection()
  }
  return db
}

export function listTableNames() {
  return getDb()
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name")
    .all()
    .map((row) => row.name)
}
