import { env } from '../../../config/env.js'

const GROQ_CHAT_COMPLETIONS_URL = 'https://api.groq.com/openai/v1/chat/completions'

function assertConfigured() {
  if (!env.groqApiKey) {
    throw new Error('GROQ_API_KEY is not configured.')
  }
}

// OpenAI-compatible format: the system prompt is the first message, not a
// separate field as in Anthropic's API.
export function buildGroqRequest({ system, messages }, model) {
  return {
    model,
    messages: [{ role: 'system', content: system }, ...messages],
    max_tokens: 1024,
    // gpt-oss models spend tokens on hidden reasoning first; "low" leaves room
    // for the visible answer within max_tokens.
    reasoning_effort: 'low',
  }
}

export function extractGroqText(data) {
  return data.choices?.[0]?.message?.content ?? ''
}

export const groqProvider = {
  name: 'groq',
  async generateReply(input) {
    assertConfigured()

    const response = await fetch(GROQ_CHAT_COMPLETIONS_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${env.groqApiKey}`,
      },
      body: JSON.stringify(buildGroqRequest(input, env.groqModel)),
    })

    if (!response.ok) {
      const errorBody = await response.text().catch(() => '')
      throw new Error(`Groq API request failed (${response.status}): ${errorBody}`)
    }

    return extractGroqText(await response.json())
  },
}
