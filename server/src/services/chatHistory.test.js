import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildModelMessages } from './chatHistory.js'

const user = (content) => ({ role: 'user', content })
const assistant = (content) => ({ role: 'assistant', content })

test('with no history, sends only the new message', () => {
  assert.deepEqual(buildModelMessages([], 'hi'), [user('hi')])
})

test('keeps the full history in order when it fits', () => {
  const history = [user('my app is about recipes'), assistant('nice'), user('who is it for?'), assistant('home cooks')]

  const result = buildModelMessages(history, 'suggest 3 names', { maxChars: 1000 })

  assert.deepEqual(result, [...history, user('suggest 3 names')])
})

test('drops the oldest messages first when over budget', () => {
  const history = [user('aaaaa'), assistant('bbbbb'), user('ccccc'), assistant('ddddd')]

  // new (3) + ddddd (5) + ccccc (5) = 13 fits; adding bbbbb would make 18.
  const result = buildModelMessages(history, 'new', { maxChars: 13 })

  assert.deepEqual(result, [user('ccccc'), assistant('ddddd'), user('new')])
})

test('stops at the first message that does not fit, leaving no gap', () => {
  const history = [user('a'), assistant('this one is far too long'), user('b'), assistant('c')]

  const result = buildModelMessages(history, 'new', { maxChars: 10 })

  assert.deepEqual(result, [user('b'), assistant('c'), user('new')])
})

test('drops a leading assistant message so the list starts with the user', () => {
  const history = [user('aaaaa'), assistant('bb'), user('cc'), assistant('dd')]

  // Budget fits dd, cc, bb but not aaaaa, which would leave bb first.
  const result = buildModelMessages(history, 'new', { maxChars: 9 })

  assert.deepEqual(result, [user('cc'), assistant('dd'), user('new')])
})

test('always sends the new message, even when it alone exceeds the budget', () => {
  const result = buildModelMessages([user('old'), assistant('reply')], 'x'.repeat(50), { maxChars: 10 })

  assert.deepEqual(result, [user('x'.repeat(50))])
})

test('sends only role and content, never database fields', () => {
  const history = [{ id: 7, conversation_id: 3, role: 'user', content: 'hi', created_at: '2026-11-23 10:00:00' }]

  const result = buildModelMessages(history, 'again', { maxChars: 100 })

  assert.deepEqual(result, [user('hi'), user('again')])
})
