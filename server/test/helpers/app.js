// First import on purpose: it sets process.env before src/config/env.js runs.
import { OUTBOX_PATH } from './env.js'
import { once } from 'node:events'
import { rm } from 'node:fs/promises'
import { env } from '../../src/config/env.js'
import { createApp } from '../../src/app.js'
import { setPostgresPoolForTests } from '../../src/db/postgresClient.js'
import { SESSION_COOKIE_NAME } from '../../src/config/auth.js'
import { createTestDatabase } from './db.js'

// If a test file imported a src/ module before this helper, env.js already
// read server/.env and the overrides above came too late. Fail loudly
// instead of sending real AI calls or touching a real database.
if (env.databaseUrl || env.anthropicApiKey || env.groqApiKey || env.nodeEnv !== 'test') {
  throw new Error('Import test/helpers/app.js before any src/ module in integration tests.')
}

// The real Express app on a random free port, over a fresh migrated database.
export async function startTestApp() {
  const database = await createTestDatabase()
  setPostgresPoolForTests(database.pool)

  const server = createApp().listen(0, '127.0.0.1')
  await once(server, 'listening')
  const baseUrl = `http://127.0.0.1:${server.address().port}/api`

  let counter = 0

  // A tiny browser: remembers the session cookie between its own requests,
  // so two clients are two different signed-in people.
  function client() {
    let cookie = ''
    return {
      async request(method, path, body) {
        const res = await fetch(baseUrl + path, {
          method,
          headers: { ...(body && { 'content-type': 'application/json' }), ...(cookie && { cookie }) },
          body: body && JSON.stringify(body),
        })
        const session = res.headers.getSetCookie().find((c) => c.startsWith(`${SESSION_COOKIE_NAME}=`))
        if (session) cookie = session.split(';')[0]
        const text = await res.text()
        return { status: res.status, body: text ? JSON.parse(text) : null }
      },
    }
  }

  // Reads the link the app "sent", the same way a developer would locally.
  async function tokenFromOutbox(email, kind = 'verify-email') {
    const res = await fetch(`${baseUrl}/dev/outbox?to=${encodeURIComponent(email)}`)
    // Newest first by id: the outbox's created_at has 1-second precision, and
    // reset() doesn't empty the outbox, so an older email to the same address
    // from an earlier test can tie with this one.
    const messages = (await res.json()).sort((a, b) => b.id - a.id)
    const match = messages.map((m) => new RegExp(`/${kind}\\?token=(\\S+)`).exec(m.body)).find(Boolean)
    if (!match) throw new Error(`No ${kind} email for ${email}`)
    return match[1]
  }

  // Register, verify through the emailed token, log in: a real signed-in user.
  async function signedInUser({ name = 'Test User', password = 'correct-horse-1' } = {}) {
    counter += 1
    const email = `user${counter}-${Date.now()}@example.com`
    const user = client()
    const registered = await user.request('POST', '/auth/register', { email, password, name })
    if (registered.status !== 201) throw new Error(`register failed: ${registered.status}`)
    const verified = await user.request('POST', '/auth/verify-email', { token: await tokenFromOutbox(email) })
    if (verified.status >= 300) throw new Error(`verify failed: ${verified.status}`)
    const login = await user.request('POST', '/auth/login', { email, password })
    if (login.status !== 200) throw new Error(`login failed: ${login.status}`)
    return Object.assign(user, { email, password })
  }

  return {
    baseUrl,
    pool: database.pool,
    client,
    tokenFromOutbox,
    signedInUser,
    reset: () => database.truncate(),
    async close() {
      await new Promise((resolve) => server.close(resolve))
      setPostgresPoolForTests(null)
      await database.close()
      // The outbox SQLite file stays open until the process exits, and Windows
      // won't delete an open file. It's in the OS temp folder, so leave it then.
      await rm(OUTBOX_PATH, { force: true }).catch(() => {})
    },
  }
}
