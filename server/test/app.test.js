// Everything else a user does, plus the plumbing: health, errors, and the
// migrated schema on whatever Postgres this runs on (17 in CI).
import { startTestApp } from './helpers/app.js'
import { test, before, after, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { compareSchemas, describeSchema, expectedSchemaFor, loadMigrations, migrate, pgClientAdapter } from '../src/db/migrator.js'

let app
let user

before(async () => {
  app = await startTestApp()
})
after(() => app.close())
beforeEach(async () => {
  await app.reset()
  user = await app.signedInUser()
})

test('projects: create, read, update, delete', async () => {
  const created = await user.request('POST', '/projects', { name: '  Job hunt  ', description: 'Q1', status: 'active' })
  assert.equal(created.status, 201)
  assert.equal(created.body.name, 'Job hunt')

  const updated = await user.request('PATCH', `/projects/${created.body.id}`, { status: 'completed' })
  assert.equal(updated.body.status, 'completed')
  assert.equal((await user.request('PATCH', `/projects/${created.body.id}`, {})).status, 400)
  assert.equal((await user.request('POST', '/projects', { name: 'x', status: 'nonsense' })).status, 400)

  assert.equal((await user.request('DELETE', `/projects/${created.body.id}`)).status, 204)
  assert.equal((await user.request('GET', `/projects/${created.body.id}`)).status, 404)
  assert.equal((await user.request('GET', '/projects/abc')).status, 400)
})

test('changes show up in activity and notifications, and can be marked read', async () => {
  const { body: project } = await user.request('POST', '/projects', { name: 'Tracked' })
  await user.request('PATCH', `/projects/${project.id}`, { name: 'Tracked 2' })

  const activity = (await user.request('GET', '/activity')).body
  assert.deepEqual(activity.map((a) => a.type).slice(0, 2), ['project_updated', 'project_created'])

  assert.equal((await user.request('GET', '/notifications/unread-count')).body.count, 2)
  const [latest] = (await user.request('GET', '/notifications')).body
  assert.equal((await user.request('PATCH', `/notifications/${latest.id}/read`)).status, 200)
  assert.equal((await user.request('GET', '/notifications/unread-count')).body.count, 1)
  assert.equal((await user.request('PATCH', '/notifications/read-all')).status, 204)
  assert.equal((await user.request('GET', '/notifications/unread-count')).body.count, 0)
})

test('preferences: defaults, a valid update, and an invalid one', async () => {
  const defaults = (await user.request('GET', '/preferences')).body
  const res = await user.request('PATCH', '/preferences', { sidebarCollapsed: !defaults.sidebarCollapsed })
  assert.equal(res.status, 200)
  assert.equal((await user.request('GET', '/preferences')).body.sidebarCollapsed, !defaults.sidebarCollapsed)
  assert.equal((await user.request('PATCH', '/preferences', { theme: 'neon' })).status, 400)
})

test('the dashboard counts what the user has', async () => {
  await user.request('POST', '/projects', { name: 'One' })
  await user.request('POST', '/agents', { name: 'Helper' })
  const { status, body } = await user.request('GET', '/dashboard/summary')
  assert.equal(status, 200)
  assert.equal(body.recentProjects.length, 1)
  assert.ok(Array.isArray(body.usage))
})

test('health endpoints answer, including the real database round trip', async () => {
  assert.equal((await app.client().request('GET', '/health')).body.status, 'ok')
  assert.deepEqual((await app.client().request('GET', '/health/db')).body, { status: 'ok' })
})

test('errors are JSON: unknown route, broken JSON body, oversized body', async () => {
  assert.equal((await user.request('GET', '/nope')).status, 404)

  const post = (body) =>
    fetch(`${app.baseUrl}/auth/login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body })
  const broken = await post('{"email":')
  assert.equal(broken.status, 400)
  assert.match((await broken.json()).error, /valid JSON/)
  assert.equal((await post(JSON.stringify({ email: 'x'.repeat(30_000) }))).status, 413)
})

test('the migrated schema matches the migrations exactly on this Postgres', async () => {
  // In CI this is Postgres 17, the version Supabase runs, where PGlite is 19.
  // A difference between engines (like PG18's NOT NULL rows) shows up here.
  const migrations = await loadMigrations()
  const diff = compareSchemas(await expectedSchemaFor(migrations), await describeSchema(app.pool))
  assert.deepEqual(diff, { missing: [], unexpected: [] })
})

test('running the migrations again changes nothing', async () => {
  const client = await app.pool.connect()
  try {
    const { applied } = await migrate(pgClientAdapter(client), await loadMigrations())
    assert.deepEqual(applied, [])
  } finally {
    client.release()
  }
})
