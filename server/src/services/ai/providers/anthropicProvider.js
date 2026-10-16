import Anthropic from '@anthropic-ai/sdk'
import { env } from '../../../config/env.js'
import { SYSTEM_PROMPT } from '../../../config/chat.js'

let client = null

function getClient() {
  if (!env.anthropicApiKey) {
    throw new Error('ANTHROPIC_API_KEY is not configured.')
  }

  if (!client) {
    client = new Anthropic({ apiKey: env.anthropicApiKey })
  }

  return client
}

// Not exercised until ANTHROPIC_API_KEY is set — getAiProvider() only selects
// this provider once a key is configured, and getClient() re-checks before
// ever touching the network.
export const anthropicProvider = {
  name: 'anthropic',
  async generateReply(message) {
    const anthropic = getClient()

    const response = await anthropic.messages.create({
      model: env.anthropicModel,
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: message }],
    })

    const textBlock = response.content?.find((block) => block.type === 'text')
    return textBlock?.text ?? ''
  },
}
