import pg from 'pg'
import { env } from '../config/env.js'

const { Pool } = pg

let pool = null

// pg sends a JS Date as an exact instant, so timestamptz comparisons need no formatting.
export function daysAgo(days) {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000)
}

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]'])

export function isLocalHost(hostname) {
  return LOCAL_HOSTS.has(hostname)
}

// Local Postgres (CI's container, the PGlite dev server) has no TLS, so asking
// for it fails the connection. Anything remote keeps TLS; an unparseable URL
// keeps it too, so a typo can't silently turn encryption off.
// rejectUnauthorized: false still encrypts; Node just doesn't ship Supabase's CA.
export function sslFor(connectionString) {
  try {
    if (isLocalHost(new URL(connectionString).hostname)) return false
  } catch {
    // fall through to TLS
  }
  return { rejectUnauthorized: false }
}

// The app's one real database connection; every db/*Repository.js queries
// through it. The dev outbox has its own separate SQLite file.
export function getPostgresPool() {
  if (!pool) {
    pool = new Pool({
      connectionString: env.databaseUrl,
      ssl: sslFor(env.databaseUrl),
      max: env.databasePoolMax,
    })
  }
  return pool
}

// Runs fn(client) inside BEGIN/COMMIT on one dedicated connection. Every
// query in a transaction must use that same client, not the pool.
export async function withTransaction(fn, pool = getPostgresPool()) {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const result = await fn(client)
    await client.query('COMMIT')
    return result
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    // Without this, every failed transaction leaks a connection until the pool hangs.
    client.release()
  }
}

// Lets repository tests run real SQL against an in-memory database.
export function setPostgresPoolForTests(testPool) {
  pool = testPool
}

export async function closePostgresPool() {
  if (pool) {
    await pool.end()
    pool = null
  }
}
