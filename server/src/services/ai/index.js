import { env } from '../../config/env.js'
import { mockProvider } from './providers/mockProvider.js'
import { anthropicProvider } from './providers/anthropicProvider.js'
import { groqProvider } from './providers/groqProvider.js'

// Anthropic wins whenever its key is set; Groq is only a fallback config.
export function getAiProvider() {
  if (env.anthropicApiKey) {
    return anthropicProvider
  }

  if (env.groqApiKey) {
    return groqProvider
  }

  return mockProvider
}
