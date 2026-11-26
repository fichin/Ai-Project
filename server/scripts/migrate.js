import pg from 'pg'
import { env } from '../src/config/env.js'
import { loadMigrations, migrate, pgClientAdapter } from '../src/db/migrator.js'

const args = new Set(process.argv.slice(2))

if (!env.databaseUrl) {
  console.error('DATABASE_URL is not set.')
  process.exit(1)
}

// server/.env may point at production: always show the target, and change
// nothing unless --yes was typed on purpose.
const target = new URL(env.databaseUrl)
console.log(`Target database: ${target.hostname}:${target.port || 5432}${target.pathname}`)

if (!args.has('--yes')) {
  console.log('Nothing changed. Re-run with --yes to apply pending migrations.')
  process.exit(0)
}

const client = new pg.Client({ connectionString: env.databaseUrl, ssl: sslFor(target) })

function sslFor(url) {
  const isLocal = url.hostname === 'localhost' || url.hostname === '127.0.0.1'
  // Same trade-off as postgresClient.js: encrypted, without Supabase's CA bundle.
  return isLocal ? false : { rejectUnauthorized: false }
}

try {
  await client.connect()
  const { applied } = await migrate(pgClientAdapter(client), await loadMigrations())
  console.log(applied.length ? `Applied: ${applied.join(', ')}` : 'Already up to date.')
} catch (error) {
  console.error(`Migration failed, nothing was changed: ${error.message}`)
  process.exitCode = 1
} finally {
  await client.end()
}
