import { test } from 'node:test'
import assert from 'node:assert/strict'
import { assertSafeDevDatabase, supabaseRefOf, UnsafeDatabaseError } from './databaseGuard.js'

const PROD_DIRECT = 'postgresql://postgres:secret-pw@db.prodref123.supabase.co:5432/postgres'
const PROD_POOLER = 'postgresql://postgres.prodref123:secret-pw@aws-0-eu-central-1.pooler.supabase.com:5432/postgres'
const DEV_POOLER = 'postgresql://postgres.devref456:pw@aws-0-eu-central-1.pooler.supabase.com:6543/postgres'

const dev = (databaseUrl, extra = {}) =>
  assertSafeDevDatabase({ databaseUrl, nodeEnv: 'development', onRender: false, devSupabaseRef: '', ...extra })

test('reads the project ref from both Supabase URL shapes', () => {
  assert.equal(supabaseRefOf(new URL(PROD_DIRECT)), 'prodref123')
  assert.equal(supabaseRefOf(new URL(PROD_POOLER)), 'prodref123')
  assert.equal(supabaseRefOf(new URL('postgresql://postgres:pw@aws-0-x.pooler.supabase.com/db')), '')
  assert.equal(supabaseRefOf(new URL('postgres://u@localhost/db')), null)
})

test('allows local databases in development', () => {
  dev('postgres://postgres@127.0.0.1:5433/postgres')
  dev('postgres://postgres:postgres@localhost:5432/postgres')
})

test('refuses a Supabase database in development, in both URL shapes', () => {
  assert.throws(() => dev(PROD_DIRECT), UnsafeDatabaseError)
  assert.throws(() => dev(PROD_POOLER), UnsafeDatabaseError)
})

test('allows only the Supabase project named in DEV_DATABASE_SUPABASE_REF', () => {
  dev(DEV_POOLER, { devSupabaseRef: 'devref456' })
  assert.throws(() => dev(PROD_POOLER, { devSupabaseRef: 'devref456' }), UnsafeDatabaseError)
})

test('refuses any remote database that is not Supabase (allow-list, not blocklist)', () => {
  assert.throws(() => dev('postgres://app:pw@db.company.internal:5432/app'), UnsafeDatabaseError)
  // Supabase's pooler reached by IP: no supabase.com in the host at all.
  assert.throws(() => dev('postgres://postgres.prodref123:pw@3.120.1.2:5432/postgres'), UnsafeDatabaseError)
})

test('a pooler URL without a ref is refused even when no dev ref is set', () => {
  // '' (ref unknown) must never match an unset DEV_DATABASE_SUPABASE_REF ('').
  assert.throws(() => dev('postgresql://postgres:pw@aws-0-x.pooler.supabase.com/db'), UnsafeDatabaseError)
})

test('the error names the host but never leaks the password', () => {
  assert.throws(
    () => dev(PROD_POOLER),
    (error) => error.message.includes('aws-0-eu-central-1.pooler.supabase.com') && !error.message.includes('secret-pw'),
  )
})

test('an unparseable URL is refused, not waved through', () => {
  assert.throws(() => dev('not a url'), UnsafeDatabaseError)
})

test('never blocks production', () => {
  assertSafeDevDatabase({ databaseUrl: PROD_POOLER, nodeEnv: 'production', onRender: false, devSupabaseRef: '' })
  assertSafeDevDatabase({ databaseUrl: PROD_POOLER, nodeEnv: 'development', onRender: true, devSupabaseRef: '' })
})

test('server.js exits with the message before it starts listening', async () => {
  const { spawnSync } = await import('node:child_process')
  const result = spawnSync(process.execPath, ['src/server.js'], {
    cwd: new URL('../..', import.meta.url),
    // Explicit values win over server/.env (dotenv never overrides), so this
    // can't pick up a real DATABASE_URL. The URL is fake and never dialled.
    env: { ...process.env, DATABASE_URL: PROD_POOLER, NODE_ENV: 'development', RENDER: '', DEV_DATABASE_SUPABASE_REF: '', PORT: '0' },
    encoding: 'utf8',
    timeout: 10_000,
  })
  assert.equal(result.status, 1)
  assert.match(result.stderr, /not a local or development database/)
  assert.doesNotMatch(result.stdout, /listening/)
})
