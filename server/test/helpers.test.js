// The helpers every integration test stands on, tested first: if these lie,
// every test built on them lies too.
import { startTestApp } from './helpers/app.js'
import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { assertLocalTestServer, createTestDatabase } from './helpers/db.js'

let app

before(async () => {
  app = await startTestApp()
})

after(async () => {
  await app.close()
})

test('the test database is fully migrated', async () => {
  const { rows } = await app.pool.query('SELECT name FROM schema_migrations ORDER BY name')
  assert.deepEqual(rows.map((r) => r.name), ['0001_baseline.sql', '0002_timestamptz.sql', '0003_drop_dev_outbox_emails.sql'])
})

test('signedInUser goes through register, the emailed token and login', async () => {
  const user = await app.signedInUser({ name: 'Ada' })
  const me = await user.request('GET', '/auth/me')
  assert.equal(me.status, 200)
  assert.equal(me.body.user.name, 'Ada')
  assert.equal(me.body.user.emailVerified, true)
})

test('each client keeps its own session', async () => {
  const ada = await app.signedInUser({ name: 'Ada' })
  const bob = await app.signedInUser({ name: 'Bob' })
  assert.equal((await ada.request('GET', '/auth/me')).body.user.name, 'Ada')
  assert.equal((await bob.request('GET', '/auth/me')).body.user.name, 'Bob')
  assert.equal((await app.client().request('GET', '/auth/me')).status, 401)
})

test('reset empties the tables, keeps the migration history and restarts ids', async () => {
  await app.signedInUser()
  await app.reset()
  const users = await app.pool.query('SELECT count(*)::int AS n FROM users')
  assert.equal(users.rows[0].n, 0)
  const history = await app.pool.query('SELECT count(*)::int AS n FROM schema_migrations')
  assert.equal(history.rows[0].n, 3)

  await app.signedInUser()
  const { rows } = await app.pool.query('SELECT id FROM users')
  assert.deepEqual(rows.map((r) => r.id), [1])
})

test('two test databases do not see each other', async () => {
  const other = await createTestDatabase()
  try {
    await app.signedInUser()
    const { rows } = await other.pool.query('SELECT count(*)::int AS n FROM users')
    assert.equal(rows[0].n, 0)
  } finally {
    await other.close()
  }
})

test('the helpers refuse a TEST_DATABASE_URL that is not local', () => {
  assert.throws(() => assertLocalTestServer('postgres://u:p@db.prodref.supabase.co:5432/postgres'), /local server/)
  assert.throws(() => assertLocalTestServer('postgres://u:p@localhost.attacker.example/db'), /local server/)
  assert.throws(() => assertLocalTestServer('not a url'), /not a valid URL/)
  assertLocalTestServer('postgres://postgres:postgres@localhost:5432/postgres')
})

test('the app uses the mock AI provider, never a real one', async () => {
  const user = await app.signedInUser()
  const status = await user.request('GET', '/chat/status')
  assert.equal(status.status, 200)
  assert.equal(status.body.simulated, true)
})
