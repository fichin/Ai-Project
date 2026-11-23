import Anthropic from '@anthropic-ai/sdk'
import { env } from '../../../config/env.js'

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

export function buildAnthropicRequest({ system, messages }, model) {
  return { model, max_tokens: 1024, system, messages }
}

// A reply can contain several text blocks; joining them keeps the whole answer.
export function extractAnthropicText(response) {
  return (response.content ?? [])
    .filter((block) => block.type === 'text')
    .map((block) => block.text)
    .join('')
}

export const anthropicProvider = {
  name: 'anthropic',
  async generateReply(input) {
    const response = await getClient().messages.create(buildAnthropicRequest(input, env.anthropicModel))
    return extractAnthropicText(response)
  },
}
