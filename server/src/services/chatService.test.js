import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  sendChatMessage,
  generateChatReply,
  ConversationNotFoundError,
  ConversationLimitError,
  ConversationQuotaError,
} from './chatService.js'
import { AiProviderError } from './ai/AiProviderError.js'
import { MAX_ASSISTANT_MESSAGES_PER_CONVERSATION } from '../config/chat.js'

const TX = { name: 'transaction client' }

// In-memory stand-ins for the repositories. `writes` records every write and
// which db handle it used, so tests can check it went through the transaction.
function fakeDeps({ conversation = { id: 7 }, history = [], reply = 'AI reply', ...overrides } = {}) {
  const calls = { writes: [], aiMessages: null, transactions: 0 }
  let nextId = 100
  const deps = {
    getConversationByIdForUser: async () => conversation,
    countConversationsByUser: async () => 0,
    countAssistantMessages: async () => 0,
    countAssistantMessagesSince: async () => 0,
    countAssistantMessagesByUserSince: async () => 0,
    listMessagesByConversation: async () => history,
    generateChatReply: async (messages) => {
      calls.aiMessages = messages
      return reply
    },
    withTransaction: async (fn) => {
      calls.transactions++
      return fn(TX)
    },
    createConversation: async (userId, title, db) => {
      calls.writes.push({ op: 'createConversation', db })
      return { id: 55 }
    },
    createMessage: async (conversationId, role, content, db) => {
      calls.writes.push({ op: 'createMessage', role, conversationId, db })
      return { id: nextId++, role, content }
    },
    setConversationTitle: async (id, title, db) => calls.writes.push({ op: 'setTitle', title, db }),
    touchConversation: async (id, db) => calls.writes.push({ op: 'touch', db }),
    ...overrides,
  }
  return { deps, calls }
}

test('existing conversation: AI gets the history plus the new message, both saved in one transaction', async () => {
  const history = [
    { role: 'user', content: 'my app is about recipes' },
    { role: 'assistant', content: 'nice' },
  ]
  const { deps, calls } = fakeDeps({ history })

  const result = await sendChatMessage({ conversationId: 7, message: 'suggest names', userId: 1 }, deps)

  assert.deepEqual(calls.aiMessages, [...history, { role: 'user', content: 'suggest names' }])
  assert.equal(calls.transactions, 1)
  assert.deepEqual(
    calls.writes.map((w) => w.op),
    ['createMessage', 'createMessage', 'touch'],
  )
  assert.ok(calls.writes.every((w) => w.db === TX))
  assert.equal(result.conversationId, 7)
  assert.equal(result.userMessage.role, 'user')
  assert.equal(result.assistantMessage.content, 'AI reply')
})

test('no conversationId: conversation is created inside the transaction and titled', async () => {
  const { deps, calls } = fakeDeps()

  const result = await sendChatMessage({ conversationId: null, message: 'Plan my week', userId: 1 }, deps)

  assert.deepEqual(calls.aiMessages, [{ role: 'user', content: 'Plan my week' }])
  assert.deepEqual(
    calls.writes.map((w) => w.op),
    ['createConversation', 'createMessage', 'setTitle', 'createMessage', 'touch'],
  )
  assert.ok(calls.writes.every((w) => w.db === TX))
  assert.equal(result.conversationId, 55)
  assert.ok(calls.writes.filter((w) => w.op === 'createMessage').every((w) => w.conversationId === 55))
})

test('existing but empty conversation gets a title from the first message', async () => {
  const { deps, calls } = fakeDeps({ history: [] })

  await sendChatMessage({ conversationId: 7, message: 'Hello there', userId: 1 }, deps)

  assert.ok(calls.writes.some((w) => w.op === 'setTitle'))
})

test('AI failure writes nothing: no transaction, no conversation, no messages', async () => {
  const { deps, calls } = fakeDeps({
    generateChatReply: async () => {
      throw new AiProviderError('down')
    },
  })

  await assert.rejects(sendChatMessage({ conversationId: null, message: 'hi', userId: 1 }, deps), AiProviderError)

  assert.equal(calls.transactions, 0)
  assert.deepEqual(calls.writes, [])
})

test('unknown conversation is a 404 and the AI is never called', async () => {
  const { deps, calls } = fakeDeps({ conversation: null })

  await assert.rejects(
    sendChatMessage({ conversationId: 999, message: 'hi', userId: 1 }, deps),
    ConversationNotFoundError,
  )
  assert.equal(calls.aiMessages, null)
})

test('per-conversation reply limit is checked before the AI call', async () => {
  const { deps, calls } = fakeDeps({
    countAssistantMessages: async () => MAX_ASSISTANT_MESSAGES_PER_CONVERSATION,
  })

  await assert.rejects(sendChatMessage({ conversationId: 7, message: 'hi', userId: 1 }, deps), ConversationLimitError)
  assert.equal(calls.aiMessages, null)
})

test('a new conversation is refused when the user is at the conversation cap', async () => {
  const { deps, calls } = fakeDeps({ countConversationsByUser: async () => 1_000 })

  await assert.rejects(
    sendChatMessage({ conversationId: null, message: 'hi', userId: 1 }, deps),
    ConversationQuotaError,
  )
  assert.equal(calls.aiMessages, null)
})

const quietConsole = (t) => t.mock.method(console, 'error', () => {})

test('generateChatReply: passes the system prompt and messages to the provider', async () => {
  let received
  const provider = { name: 'fake', generateReply: async (input) => ((received = input), 'ok') }
  const messages = [{ role: 'user', content: 'hi' }]

  assert.equal(await generateChatReply(messages, provider), 'ok')
  assert.equal(typeof received.system, 'string')
  assert.deepEqual(received.messages, messages)
})

test('generateChatReply: an empty or blank reply is an AiProviderError', async (t) => {
  quietConsole(t)
  for (const reply of ['', '   ', undefined]) {
    const provider = { name: 'fake', generateReply: async () => reply }
    await assert.rejects(generateChatReply([], provider), AiProviderError)
  }
})

test('generateChatReply: a provider crash becomes an AiProviderError', async (t) => {
  quietConsole(t)
  const provider = {
    name: 'fake',
    generateReply: async () => {
      throw new Error('socket hang up')
    },
  }
  await assert.rejects(generateChatReply([], provider), AiProviderError)
})
