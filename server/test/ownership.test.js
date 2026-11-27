// One user must never read, change or delete another user's data. The answer
// is 404, not 403: a 403 would confirm that the id exists.
import { startTestApp } from './helpers/app.js'
import { test, before, after, beforeEach } from 'node:test'
import assert from 'node:assert/strict'

let app
let ada
let bob

before(async () => {
  app = await startTestApp()
})
after(() => app.close())
beforeEach(async () => {
  await app.reset()
  ada = await app.signedInUser({ name: 'Ada' })
  bob = await app.signedInUser({ name: 'Bob' })
})

async function count(table) {
  const { rows } = await app.pool.query(`SELECT count(*)::int AS n FROM ${table}`)
  return rows[0].n
}

test("projects: Bob gets 404 for Ada's project and it stays untouched", async () => {
  const { body: project } = await ada.request('POST', '/projects', { name: 'Ada secret' })

  assert.equal((await bob.request('GET', `/projects/${project.id}`)).status, 404)
  assert.equal((await bob.request('PATCH', `/projects/${project.id}`, { name: 'pwned' })).status, 404)
  assert.equal((await bob.request('DELETE', `/projects/${project.id}`)).status, 404)
  assert.deepEqual((await bob.request('GET', '/projects')).body, [])

  assert.equal((await ada.request('GET', `/projects/${project.id}`)).body.name, 'Ada secret')
})

test("agents: Bob gets 404 for Ada's agent and it stays untouched", async () => {
  const { body: agent } = await ada.request('POST', '/agents', { name: 'Ada agent' })

  assert.equal((await bob.request('GET', `/agents/${agent.id}`)).status, 404)
  assert.equal((await bob.request('PATCH', `/agents/${agent.id}`, { name: 'pwned' })).status, 404)
  assert.equal((await bob.request('DELETE', `/agents/${agent.id}`)).status, 404)
  assert.equal((await ada.request('GET', `/agents/${agent.id}`)).body.name, 'Ada agent')
})

test("agents: Bob cannot attach his agent to Ada's project", async () => {
  const { body: project } = await ada.request('POST', '/projects', { name: 'Ada project' })
  const res = await bob.request('POST', '/agents', { name: 'Sneaky', project_id: project.id })
  assert.equal(res.status, 400)
  assert.equal(await count('agents'), 0)
})

test("conversations: Bob cannot read, continue or delete Ada's chat", async () => {
  const { body: chat } = await ada.request('POST', '/chat', { message: 'my private plan' })

  assert.equal((await bob.request('GET', `/conversations/${chat.conversationId}/messages`)).status, 404)
  assert.equal((await bob.request('POST', '/chat', { message: 'hi', conversationId: chat.conversationId })).status, 404)
  assert.equal((await bob.request('DELETE', `/conversations/${chat.conversationId}`)).status, 404)
  assert.deepEqual((await bob.request('GET', '/conversations')).body, [])

  assert.equal(await count('messages'), 2, "Bob's attempt must not add a message to Ada's chat")
})

test("notifications: Bob cannot mark Ada's notification as read", async () => {
  await ada.request('POST', '/projects', { name: 'Ada project' })
  const [notification] = (await ada.request('GET', '/notifications')).body

  assert.equal((await bob.request('PATCH', `/notifications/${notification.id}/read`)).status, 404)
  await bob.request('PATCH', '/notifications/read-all')
  assert.equal((await ada.request('GET', '/notifications/unread-count')).body.count, 1)
})

test('the dashboard and activity only show your own numbers', async () => {
  await ada.request('POST', '/projects', { name: 'One' })
  await ada.request('POST', '/projects', { name: 'Two' })

  const bobDashboard = (await bob.request('GET', '/dashboard/summary')).body
  assert.deepEqual(bobDashboard.recentProjects, [])
  assert.deepEqual((await bob.request('GET', '/activity')).body, [])
  assert.equal((await ada.request('GET', '/dashboard/summary')).body.recentProjects.length, 2)
})

test('every protected route refuses a request without a session', async () => {
  const anonymous = app.client()
  for (const path of ['/projects', '/agents', '/conversations', '/notifications', '/preferences', '/dashboard/summary', '/activity']) {
    assert.equal((await anonymous.request('GET', path)).status, 401, path)
  }
  assert.equal((await anonymous.request('POST', '/chat', { message: 'hi' })).status, 401)
})
