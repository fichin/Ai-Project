import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildAnthropicRequest, extractAnthropicText } from './anthropicProvider.js'
import { buildGroqRequest, extractGroqText } from './groqProvider.js'
import { mockProvider } from './mockProvider.js'

const input = {
  system: 'You are helpful.',
  messages: [
    { role: 'user', content: 'my app is about recipes' },
    { role: 'assistant', content: 'nice' },
    { role: 'user', content: 'suggest 3 names' },
  ],
}

test('anthropic: system prompt goes in its own field, history passes through unchanged', () => {
  assert.deepEqual(buildAnthropicRequest(input, 'claude-test'), {
    model: 'claude-test',
    max_tokens: 1024,
    system: 'You are helpful.',
    messages: input.messages,
  })
})

test('anthropic: joins every text block and ignores other block types', () => {
  const response = {
    content: [
      { type: 'thinking', thinking: '' },
      { type: 'text', text: 'Hello ' },
      { type: 'text', text: 'world' },
    ],
  }

  assert.equal(extractAnthropicText(response), 'Hello world')
})

test('anthropic: no text blocks gives an empty string', () => {
  assert.equal(extractAnthropicText({ content: [] }), '')
  assert.equal(extractAnthropicText({}), '')
})

test('groq: system prompt becomes the first message, followed by the history', () => {
  const request = buildGroqRequest(input, 'groq-test')

  assert.equal(request.model, 'groq-test')
  assert.deepEqual(request.messages, [{ role: 'system', content: 'You are helpful.' }, ...input.messages])
})

test('groq: reads the first choice, empty string when missing', () => {
  assert.equal(extractGroqText({ choices: [{ message: { content: 'hi' } }] }), 'hi')
  assert.equal(extractGroqText({ choices: [] }), '')
})

test('mock: reports how many earlier messages it received', async () => {
  const reply = await mockProvider.generateReply(input)

  assert.match(reply, /received 2 earlier message\(s\)/)
})
