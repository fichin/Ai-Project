import pg from 'pg'
import { env } from '../src/config/env.js'
import {
  baseline,
  compareSchemas,
  describeSchema,
  expectedSchemaFor,
  loadMigrations,
  migrate,
  pgClientAdapter,
  status,
} from '../src/db/migrator.js'
import { sslFor } from '../src/db/postgresClient.js'

// npm run migrate                      print the target, change nothing
// npm run migrate -- --check           read-only: applied, pending, schema drift
// npm run migrate -- --dry-run         run pending migrations, then roll back
// npm run migrate -- --baseline --yes  record 0001 on a hand-built database
// npm run migrate -- --yes             apply pending migrations
const args = new Set(process.argv.slice(2))

if (!env.databaseUrl) {
  console.error('DATABASE_URL is not set.')
  process.exit(1)
}

// server/.env may point at production: always show the target, and change
// nothing unless --yes was typed on purpose.
const target = new URL(env.databaseUrl)
console.log(`Target database: ${target.hostname}:${target.port || 5432}${target.pathname}`)

const wantsCheck = args.has('--check')
const wantsDryRun = args.has('--dry-run')
const wantsBaseline = args.has('--baseline')

if (wantsBaseline && !args.has('--yes')) {
  console.log('Nothing changed. --baseline writes to the database: add --yes.')
  process.exit(0)
}
if (!wantsCheck && !wantsDryRun && !args.has('--yes')) {
  console.log('Nothing changed. Use --check, --dry-run, or --yes to apply pending migrations.')
  process.exit(0)
}

async function rowCounts(db) {
  const { rows } = await db.query(
    `SELECT table_name FROM information_schema.tables
     WHERE table_schema = 'public' AND table_name <> 'schema_migrations' ORDER BY table_name`,
  )
  const counts = {}
  for (const { table_name: table } of rows) {
    const result = await db.query(`SELECT count(*)::int AS n FROM "${table}"`)
    counts[table] = result.rows[0].n
  }
  return counts
}

function printCounts(before, after) {
  for (const table of Object.keys(before)) {
    const now = table in after ? after[table] : 'dropped'
    const flag = now !== 'dropped' && now !== before[table] ? '  <-- CHANGED' : ''
    console.log(`  ${table}: ${before[table]} -> ${now}${flag}`)
  }
}

function printDrift(drift) {
  for (const line of drift.missing) console.log(`  missing:    ${line}`)
  for (const line of drift.unexpected) console.log(`  unexpected: ${line}`)
}

async function schemaDrift(db, migrations, names) {
  const expected = await expectedSchemaFor(migrations.filter((m) => names.includes(m.name)))
  return compareSchemas(expected, await describeSchema(db))
}

const client = new pg.Client({ connectionString: env.databaseUrl, ssl: sslFor(env.databaseUrl) })

try {
  await client.connect()
  const db = pgClientAdapter(client)
  const migrations = await loadMigrations()

  if (wantsCheck) {
    const result = await status(db, migrations)
    console.log(`Applied: ${result.applied.join(', ') || 'none (not tracked yet)'}`)
    console.log(`Pending: ${result.pending.join(', ') || 'none'}`)
    if (result.problem) console.log(`PROBLEM: ${result.problem}`)
    // An untracked hand-built database should match 0001 before it is baselined.
    const compareTo = result.applied.length ? result.applied : ['0001_baseline.sql']
    const drift = await schemaDrift(db, migrations, compareTo)
    const clean = !drift.missing.length && !drift.unexpected.length
    console.log(clean ? `Schema matches ${compareTo.at(-1)}.` : `Schema differs from ${compareTo.at(-1)}:`)
    printDrift(drift)
  } else if (wantsBaseline) {
    const drift = await schemaDrift(db, migrations, ['0001_baseline.sql'])
    if (drift.missing.length || drift.unexpected.length) {
      console.log('Refusing to baseline: the schema does not match 0001_baseline.sql.')
      printDrift(drift)
      process.exitCode = 1
    } else {
      await baseline(db, migrations)
      console.log('Recorded 0001_baseline.sql as applied (nothing else changed).')
    }
  } else {
    const before = await rowCounts(db)
    const result = await migrate(db, migrations, { dryRun: wantsDryRun, inspect: rowCounts })
    if (!result.applied.length) {
      console.log('Already up to date.')
    } else {
      const verb = wantsDryRun ? 'Dry run, rolled back. Would apply' : 'Applied'
      console.log(`${verb}: ${result.applied.join(', ')}`)
      console.log('Row counts (before -> after):')
      printCounts(before, result.inspected)
    }
  }
} catch (error) {
  console.error(`Failed, nothing was changed: ${error.message}`)
  process.exitCode = 1
} finally {
  await client.end()
}
