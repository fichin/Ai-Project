import { startTestApp } from './helpers/app.js'
import { test, before, after, beforeEach } from 'node:test'
import assert from 'node:assert/strict'

let app

before(async () => {
  app = await startTestApp()
})
after(() => app.close())
beforeEach(() => app.reset())

const PASSWORD = 'correct-horse-1'

async function register(email = 'ada@example.com') {
  const client = app.client()
  const res = await client.request('POST', '/auth/register', { email, password: PASSWORD, name: 'Ada' })
  return { client, res }
}

test('register validates input and gives no session before verification', async () => {
  const client = app.client()
  assert.equal((await client.request('POST', '/auth/register', { email: 'nope', password: PASSWORD, name: 'A' })).status, 400)
  assert.equal((await client.request('POST', '/auth/register', { email: 'a@example.com', password: 'short', name: 'A' })).status, 400)

  const { client: ada, res } = await register()
  assert.equal(res.status, 201)
  assert.equal(res.body.requiresVerification, true)
  assert.equal((await ada.request('GET', '/auth/me')).status, 401)
})

test('the same email cannot register twice, whatever its case', async () => {
  await register('ada@example.com')
  const { res } = await register('  ADA@Example.com ')
  assert.equal(res.status, 409)
})

test('login is refused until the email is verified, then works', async () => {
  const { client } = await register()
  const early = await client.request('POST', '/auth/login', { email: 'ada@example.com', password: PASSWORD })
  assert.equal(early.status, 403)
  assert.equal(early.body.code, 'EMAIL_NOT_VERIFIED')

  const token = await app.tokenFromOutbox('ada@example.com')
  assert.equal((await client.request('POST', '/auth/verify-email', { token })).status, 200)
  assert.equal((await client.request('POST', '/auth/login', { email: 'ada@example.com', password: PASSWORD })).status, 200)
  assert.equal((await client.request('GET', '/auth/me')).body.user.email, 'ada@example.com')
})

test('a verification token works only once', async () => {
  const { client } = await register()
  const token = await app.tokenFromOutbox('ada@example.com')
  assert.equal((await client.request('POST', '/auth/verify-email', { token })).status, 200)
  assert.equal((await client.request('POST', '/auth/verify-email', { token })).status, 400)
})

test('wrong password and unknown email get the same answer', async () => {
  const user = await app.signedInUser()
  const wrong = await app.client().request('POST', '/auth/login', { email: user.email, password: 'wrong-password' })
  const unknown = await app.client().request('POST', '/auth/login', { email: 'nobody@example.com', password: 'whatever1' })
  assert.equal(wrong.status, 401)
  assert.deepEqual(wrong, unknown)
})

test('logout ends the session on the server, not just in the browser', async () => {
  const user = await app.signedInUser()
  const { rows } = await app.pool.query('SELECT count(*)::int AS n FROM sessions')
  assert.equal(rows[0].n, 1)

  assert.equal((await user.request('POST', '/auth/logout')).status, 204)
  assert.equal((await user.request('GET', '/auth/me')).status, 401)
  const after = await app.pool.query('SELECT count(*)::int AS n FROM sessions')
  assert.equal(after.rows[0].n, 0)
})

test('forgot-password answers the same for unknown emails (no account probing)', async () => {
  const user = await app.signedInUser()
  const known = await app.client().request('POST', '/auth/forgot-password', { email: user.email })
  const unknown = await app.client().request('POST', '/auth/forgot-password', { email: 'nobody@example.com' })
  assert.equal(known.status, 200)
  assert.deepEqual(known, unknown)
})

test('reset-password changes the password, signs out every session and is single-use', async () => {
  const user = await app.signedInUser()
  await app.client().request('POST', '/auth/forgot-password', { email: user.email })
  const token = await app.tokenFromOutbox(user.email, 'reset-password')

  const reset = await app.client().request('POST', '/auth/reset-password', { token, password: 'brand-new-pass' })
  assert.equal(reset.status, 200)
  assert.equal((await user.request('GET', '/auth/me')).status, 401, 'old sessions must be revoked')
  assert.equal((await app.client().request('POST', '/auth/login', { email: user.email, password: user.password })).status, 401)
  assert.equal((await app.client().request('POST', '/auth/login', { email: user.email, password: 'brand-new-pass' })).status, 200)
  assert.equal((await app.client().request('POST', '/auth/reset-password', { token, password: 'another-pass-1' })).status, 400)
})

test('profile updates cannot change the email address', async () => {
  const user = await app.signedInUser()
  const res = await user.request('PATCH', '/auth/me', { name: 'Renamed', email: 'hijack@example.com' })
  assert.equal(res.status, 200)
  assert.equal(res.body.user.name, 'Renamed')
  assert.equal(res.body.user.email, user.email)
})

test('stored passwords are hashed, never plain text', async () => {
  const user = await app.signedInUser()
  const { rows } = await app.pool.query('SELECT password_hash FROM users WHERE email = $1', [user.email])
  assert.ok(rows[0].password_hash)
  assert.ok(!rows[0].password_hash.includes(user.password))
})
