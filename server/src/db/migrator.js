import { createHash } from 'node:crypto'
import { readdir, readFile } from 'node:fs/promises'

export const MIGRATIONS_DIR = new URL('../../migrations/', import.meta.url)

// Any fixed number works; every migrate run must use the same one to queue up.
const MIGRATION_LOCK_ID = 5_000_001

const MIGRATION_FILE = /^\d{4}_[a-z0-9_]+\.sql$/

// Windows checkouts get CRLF and Linux gets LF: hash the same text the same way.
export function checksumOf(sql) {
  return createHash('sha256').update(sql.replace(/\r\n/g, '\n')).digest('hex')
}

// listFiles is injectable so tests can prove the order doesn't depend on the OS.
export async function loadMigrations(dir = MIGRATIONS_DIR, { listFiles = readdir } = {}) {
  // Zero-padded prefixes make plain string order the run order.
  const names = (await listFiles(dir)).filter((name) => MIGRATION_FILE.test(name)).sort()
  return Promise.all(
    names.map(async (name) => {
      const sql = await readFile(new URL(name, dir), 'utf8')
      return { name, sql, checksum: checksumOf(sql) }
    }),
  )
}

// Works with a pg client (query runs multi-statement SQL when there are no
// params) and with PGlite (which needs exec for that).
export function pgClientAdapter(client) {
  return {
    query: (text, params) => client.query(text, params),
    exec: (text) => client.query(text),
  }
}

async function readApplied(db) {
  await db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      name TEXT PRIMARY KEY,
      checksum TEXT NOT NULL,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )`)
  const { rows } = await db.query('SELECT name, checksum FROM schema_migrations ORDER BY name')
  return new Map(rows.map((row) => [row.name, row.checksum]))
}

// Applied history must match the files exactly; otherwise the database and the
// repo disagree about what the schema is, and running more would guess.
function assertHistoryMatches(applied, migrations) {
  const byName = new Map(migrations.map((m) => [m.name, m]))
  for (const [name, checksum] of applied) {
    const file = byName.get(name)
    if (!file) {
      throw new Error(`${name} is applied in the database but missing from migrations/`)
    }
    if (file.checksum !== checksum) {
      throw new Error(`${name} was edited after it was applied; add a new migration instead`)
    }
  }
}

// All pending migrations run in one transaction: either all of them land or
// none do, because Postgres can roll back DDL too.
export async function migrate(db, migrations) {
  await db.exec('BEGIN')
  try {
    await db.query('SELECT pg_advisory_xact_lock($1)', [MIGRATION_LOCK_ID])
    const applied = await readApplied(db)
    assertHistoryMatches(applied, migrations)

    const pending = migrations.filter((m) => !applied.has(m.name))
    for (const migration of pending) {
      await db.exec(migration.sql)
      await db.query('INSERT INTO schema_migrations (name, checksum) VALUES ($1, $2)', [
        migration.name,
        migration.checksum,
      ])
    }

    await db.exec('COMMIT')
    return { applied: pending.map((m) => m.name) }
  } catch (error) {
    await db.exec('ROLLBACK')
    throw error
  }
}
