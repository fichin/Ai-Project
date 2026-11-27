// Chat and its cost caps, end to end. The AI is the mock provider (see
// helpers/env.js); the caps are pinned there: 2 conversations, 12 AI replies a
// day, and the fixed 10 replies per conversation from config/chat.js.
import { startTestApp } from './helpers/app.js'
import { test, before, after, beforeEach } from 'node:test'
import assert from 'node:assert/strict'

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

const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/

async function send(message, conversationId) {
  return user.request('POST', '/chat', { message, ...(conversationId && { conversationId }) })
}

test('a first message creates the conversation, titled from the message', async () => {
  const res = await send('Plan my job search')
  assert.equal(res.status, 200)
  assert.match(res.body.assistantMessage.content, /mock response/)

  const [conversation] = (await user.request('GET', '/conversations')).body
  assert.equal(conversation.id, res.body.conversationId)
  assert.match(conversation.title, /Plan my job search/)
  assert.equal(conversation.messageCount, 2)
})

test('timestamps reach the client as ISO 8601 in UTC', async () => {
  // Through the real pg driver: timestamptz columns become Date objects,
  // which JSON turns into ISO strings. The frontend's parseApiDate relies on it.
  const res = await send('hello')
  assert.match(res.body.userMessage.createdAt, ISO)
  const [conversation] = (await user.request('GET', '/conversations')).body
  assert.match(conversation.createdAt, ISO)
})

test('a follow-up message sends the earlier messages to the AI', async () => {
  const first = await send('one')
  const second = await send('two', first.body.conversationId)
  // The mock reports how much history it received: "one" plus its reply.
  assert.match(second.body.assistantMessage.content, /received 2 earlier message/)

  const messages = (await user.request('GET', `/conversations/${first.body.conversationId}/messages`)).body
  assert.deepEqual(messages.map((m) => m.role), ['user', 'assistant', 'user', 'assistant'])
})

test('the conversation cap applies to new chats and to POST /conversations', async () => {
  await send('first')
  await send('second')
  assert.equal((await send('third')).status, 429)
  assert.equal((await user.request('POST', '/conversations', {})).status, 429)
  assert.equal((await user.request('GET', '/conversations')).body.length, 2)
})

test('a conversation stops at 10 AI replies, and the refused message is not saved', async () => {
  const { body } = await send('message 1')
  for (let i = 2; i <= 10; i += 1) {
    assert.equal((await send(`message ${i}`, body.conversationId)).status, 200)
  }
  assert.equal((await send('message 11', body.conversationId)).status, 429)

  const messages = (await user.request('GET', `/conversations/${body.conversationId}/messages`)).body
  assert.equal(messages.length, 20)
})

test('the daily cap counts replies across all conversations of the user', async () => {
  const first = await send('a')
  for (let i = 0; i < 9; i += 1) await send('a', first.body.conversationId)
  const second = await send('b')
  await send('b', second.body.conversationId)
  // 12 replies today: conversation 2 is far below its own cap of 10.
  const refused = await send('b', second.body.conversationId)
  assert.equal(refused.status, 429)
  assert.match(refused.body.error, /daily|today/i)

  // Another user is not affected.
  const other = await app.signedInUser()
  assert.equal((await other.request('POST', '/chat', { message: 'hi' })).status, 200)
})

test('deleting a conversation deletes its messages', async () => {
  const { body } = await send('to be deleted')
  assert.equal((await user.request('DELETE', `/conversations/${body.conversationId}`)).status, 204)
  const { rows } = await app.pool.query('SELECT count(*)::int AS n FROM messages')
  assert.equal(rows[0].n, 0)
})

test('bad input is rejected before any AI call', async () => {
  assert.equal((await user.request('POST', '/chat', { message: '   ' })).status, 400)
  assert.equal((await user.request('POST', '/chat', { message: 'x'.repeat(2001) })).status, 400)
  assert.equal((await user.request('POST', '/chat', { message: 'hi', conversationId: 'abc' })).status, 400)
  const { rows } = await app.pool.query('SELECT count(*)::int AS n FROM messages')
  assert.equal(rows[0].n, 0)
})
