import { env } from '../../../config/env.js'
import { SYSTEM_PROMPT } from '../../../config/chat.js'

const GROQ_CHAT_COMPLETIONS_URL = 'https://api.groq.com/openai/v1/chat/completions'

function assertConfigured() {
  if (!env.groqApiKey) {
    throw new Error('GROQ_API_KEY is not configured.')
  }
}

// Groq's API is OpenAI-compatible REST — a plain `fetch` call is enough,
// no SDK dependency needed (unlike anthropicProvider, which uses Anthropic's
// own SDK since that's the primary paid provider).
export const groqProvider = {
  name: 'groq',
  async generateReply(message) {
    assertConfigured()

    const response = await fetch(GROQ_CHAT_COMPLETIONS_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${env.groqApiKey}`,
      },
      body: JSON.stringify({
        model: env.groqModel,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: message },
        ],
        max_tokens: 1024,
        // Groq's gpt-oss models spend part of the token budget on hidden
        // chain-of-thought before writing the actual answer — on a low
        // max_tokens that reasoning can eat the whole budget and leave
        // `content` empty. "low" keeps that reasoning pass short so the
        // visible answer reliably comes through; this app doesn't need
        // the model to show its work.
        reasoning_effort: 'low',
      }),
    })

    if (!response.ok) {
      const errorBody = await response.text().catch(() => '')
      throw new Error(`Groq API request failed (${response.status}): ${errorBody}`)
    }

    const data = await response.json()
    return data.choices?.[0]?.message?.content ?? ''
  },
}
