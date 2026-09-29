import pg from 'pg'
import { env } from '../config/env.js'

const { Pool } = pg

let pool = null

// Matches SQLite's `datetime('now')` output format ("YYYY-MM-DD HH:MM:SS",
// UTC) as a raw SQL fragment — migrated repositories interpolate this into
// their queries instead of a native TIMESTAMPTZ, so formatRelativeTime.js
// (which parses that exact string shape) keeps working unchanged. See
// postgresSchema.js for the full rationale; this is the same expression
// used there for column defaults, shared here for use in UPDATE/WHERE
// clauses so it can't drift between files.
export const NOW_UTC_SQL = `to_char(now() AT TIME ZONE 'utc', 'YYYY-MM-DD HH24:MI:SS')`

// SQLite's `datetime('now', '-N days')` computed a relative boundary
// server-side; Postgres has no single drop-in equivalent for an
// arbitrary/dynamic offset embedded in a query. Rather than building
// parameterized interval SQL fragments (fragile to get right across
// multiple call sites in one query), the boundary is computed here in JS,
// in the exact same UTC text format as every stored timestamp, and passed
// as a plain bound parameter — e.g. `created_at >= $2` with
// `utcTextDaysAgo(7)` as $2. Used by dashboardRepository.js's trend/usage
// queries.
export function utcTextDaysAgo(days = 0) {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().slice(0, 19).replace('T', ' ')
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

export async function closePostgresPool() {
  if (pool) {
    await pool.end()
    pool = null
  }
}
