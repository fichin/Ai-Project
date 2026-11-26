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
// none do, because Postgres can roll back DDL too. A dry run does the real
// work, then rolls back, so bad data fails here instead of in the real run.
// inspect(db) runs inside the transaction, after the migrations.
export async function migrate(db, migrations, { dryRun = false, inspect } = {}) {
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
    const inspected = inspect ? await inspect(db) : undefined

    await db.exec(dryRun ? 'ROLLBACK' : 'COMMIT')
    return { applied: pending.map((m) => m.name), dryRun, inspected }
  } catch (error) {
    await db.exec('ROLLBACK')
    throw error
  }
}

// Read-only: a READ ONLY transaction makes Postgres itself refuse any write.
export async function status(db, migrations) {
  await db.exec('BEGIN READ ONLY')
  try {
    const { rows } = await db.query(`SELECT to_regclass('public.schema_migrations') IS NOT NULL AS tracked`)
    const applied = new Map()
    if (rows[0].tracked) {
      const result = await db.query('SELECT name, checksum FROM schema_migrations ORDER BY name')
      for (const row of result.rows) applied.set(row.name, row.checksum)
    }
    let problem = null
    try {
      assertHistoryMatches(applied, migrations)
    } catch (error) {
      problem = error.message
    }
    return {
      applied: [...applied.keys()],
      pending: migrations.filter((m) => !applied.has(m.name)).map((m) => m.name),
      problem,
    }
  } finally {
    await db.exec('ROLLBACK')
  }
}

// Records 0001 as applied without running it, for a database that was set up
// by hand before migrations existed. Only allowed on an untracked database
// whose schema really matches 0001 (checked by the caller, see describeSchema).
export async function baseline(db, migrations, name = '0001_baseline.sql') {
  const first = migrations.find((m) => m.name === name)
  if (!first) throw new Error(`${name} not found`)

  await db.exec('BEGIN')
  try {
    await db.query('SELECT pg_advisory_xact_lock($1)', [MIGRATION_LOCK_ID])
    const { rows } = await db.query(`SELECT to_regclass('public.users') IS NOT NULL AS has_tables`)
    if (!rows[0].has_tables) {
      throw new Error('This database is empty: run the migrations instead of baselining')
    }
    const applied = await readApplied(db)
    if (applied.size > 0) {
      throw new Error('This database already tracks migrations: nothing to baseline')
    }
    await db.query('INSERT INTO schema_migrations (name, checksum) VALUES ($1, $2)', [first.name, first.checksum])
    await db.exec('COMMIT')
  } catch (error) {
    await db.exec('ROLLBACK')
    throw error
  }
}

// One line per column, constraint and index, so two databases can be compared
// line by line. Columns alone missed hand-made changes such as an extra index.
export async function describeSchema(db) {
  const columns = await db.query(`
    SELECT table_name, column_name, data_type, is_nullable, column_default
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name <> 'schema_migrations'`)
  const constraints = await db.query(`
    SELECT rel.relname AS table_name, con.conname AS name, pg_get_constraintdef(con.oid) AS definition
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_namespace ns ON ns.oid = rel.relnamespace
    WHERE ns.nspname = 'public' AND rel.relname <> 'schema_migrations'
      -- Postgres 18+ also lists NOT NULL here; older versions don't, and the
      -- column lines already carry it, so leave it out to compare across versions.
      AND con.contype <> 'n'`)
  const indexes = await db.query(`
    SELECT tablename AS table_name, indexname AS name, indexdef AS definition
    FROM pg_indexes
    WHERE schemaname = 'public' AND tablename <> 'schema_migrations'`)

  return [
    ...columns.rows.map(
      (r) =>
        `${r.table_name}.${r.column_name} ${r.data_type}` +
        `${r.is_nullable === 'NO' ? ' not null' : ''}` +
        `${r.column_default === null ? '' : ` default ${r.column_default}`}`,
    ),
    ...constraints.rows.map((r) => `constraint ${r.table_name}.${r.name} ${r.definition}`),
    ...indexes.rows.map((r) => `index ${r.table_name}.${r.name} ${r.definition}`),
  ].sort()
}

export function compareSchemas(expected, actual) {
  const actualSet = new Set(actual)
  const expectedSet = new Set(expected)
  return {
    missing: expected.filter((line) => !actualSet.has(line)),
    unexpected: actual.filter((line) => !expectedSet.has(line)),
  }
}

// The schema the given migrations produce, built in a throwaway in-memory
// Postgres. PGlite is a dev dependency, so it is only loaded when needed.
export async function expectedSchemaFor(migrations) {
  const { PGlite } = await import('@electric-sql/pglite')
  const scratch = new PGlite()
  try {
    await migrate(scratch, migrations)
    return await describeSchema(scratch)
  } finally {
    await scratch.close()
  }
}
