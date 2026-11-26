import pg from 'pg'
import { env } from '../config/env.js'

const { Pool } = pg

let pool = null

// pg sends a JS Date as an exact instant, so timestamptz comparisons need no formatting.
export function daysAgo(days) {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000)
}

// The app's one real database connection — every db/*Repository.js file
// queries through this pool. The only other SQLite left anywhere in the
// server is devOutboxDb.js's own tiny standalone connection for the
// dev-only email outbox, which is deliberately separate from this.
//
// `rejectUnauthorized: false` skips CA chain validation (the connection is
// still encrypted via TLS) since Node doesn't ship Supabase's CA by
// default — the same setting Supabase's own docs recommend for a plain
// `pg` client without additionally configuring their CA bundle.
export function getPostgresPool() {
  if (!pool) {
    pool = new Pool({
      connectionString: env.databaseUrl,
      ssl: { rejectUnauthorized: false },
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
