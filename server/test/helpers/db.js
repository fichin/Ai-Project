import { randomBytes } from 'node:crypto'
import pg from 'pg'
import { PGlite } from '@electric-sql/pglite'
import { PGLiteSocketServer } from '@electric-sql/pglite-socket'
import { loadMigrations, migrate, pgClientAdapter } from '../../src/db/migrator.js'
import { isLocalHost } from '../../src/db/postgresClient.js'

// One fresh, fully migrated database per test file.
// - TEST_DATABASE_URL set (CI): a real Postgres server; each file creates its
//   own database on it, so files can run in parallel without seeing each other.
// - Not set (your laptop, no Docker): PGlite over TCP, same pg driver.
export async function createTestDatabase() {
  const migrations = await loadMigrations()
  return process.env.TEST_DATABASE_URL
    ? createOnServer(process.env.TEST_DATABASE_URL, migrations)
    : createOnPglite(migrations)
}

// The tests TRUNCATE and DROP. Pointing them at anything but a local
// server must be impossible, not just unlikely.
export function assertLocalTestServer(serverUrl) {
  let host
  try {
    host = new URL(serverUrl).hostname
  } catch {
    throw new Error('TEST_DATABASE_URL is not a valid URL.')
  }
  if (!isLocalHost(host)) {
    throw new Error(`TEST_DATABASE_URL must point at a local server, not ${host}: the tests drop and truncate data.`)
  }
}

async function createOnServer(serverUrl, migrations) {
  assertLocalTestServer(serverUrl)
  // Letters and digits only, so the name is safe to put straight into SQL.
  const name = `test_${randomBytes(6).toString('hex')}`
  const admin = new pg.Client({ connectionString: serverUrl, ssl: false })
  await admin.connect()
  await admin.query(`CREATE DATABASE ${name}`)

  const url = new URL(serverUrl)
  url.pathname = `/${name}`
  const migrator = new pg.Client({ connectionString: url.href, ssl: false })
  await migrator.connect()
  try {
    await migrate(pgClientAdapter(migrator), migrations)
  } finally {
    await migrator.end()
  }

  const pool = new pg.Pool({ connectionString: url.href, ssl: false })
  return withHelpers(pool, async () => {
    await pool.end()
    // FORCE: a connection the test forgot to release must not block the drop.
    await admin.query(`DROP DATABASE IF EXISTS ${name} WITH (FORCE)`)
    await admin.end()
  })
}

async function createOnPglite(migrations) {
  const db = new PGlite()
  await migrate(db, migrations)
  const { server, port } = await listenOnFreePort(db)
  // max 1: the socket server shares one session between all connections.
  const pool = new pg.Pool({ connectionString: `postgres://postgres@127.0.0.1:${port}/postgres`, ssl: false, max: 1 })
  return withHelpers(pool, async () => {
    await pool.end()
    await server.stop()
    await db.close()
  })
}

async function listenOnFreePort(db, attempts = 5) {
  for (let i = 1; ; i += 1) {
    const port = 55000 + Math.floor(Math.random() * 5000)
    const server = new PGLiteSocketServer({ db, port, host: '127.0.0.1' })
    try {
      await server.start()
      return { server, port }
    } catch (error) {
      if (error.code !== 'EADDRINUSE' || i === attempts) throw error
    }
  }
}

function withHelpers(pool, close) {
  return {
    pool,
    // Empties every app table between tests; keeps schema_migrations so the
    // schema stays "migrated". RESTART IDENTITY makes ids start at 1 again.
    async truncate() {
      const { rows } = await pool.query(
        `SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> 'schema_migrations'`,
      )
      if (rows.length === 0) return
      const tables = rows.map((r) => `"${r.tablename}"`).join(', ')
      await pool.query(`TRUNCATE ${tables} RESTART IDENTITY CASCADE`)
    },
    close,
  }
}
