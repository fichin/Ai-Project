import { env } from '../../config/env.js'
import { mockProvider } from './providers/mockProvider.js'
import { anthropicProvider } from './providers/anthropicProvider.js'
import { groqProvider } from './providers/groqProvider.js'

// Single switch point: once ANTHROPIC_API_KEY is set in the environment,
// this automatically starts returning the real provider — no other code
// needs to change. GROQ_API_KEY is the free-tier fallback, used only when
// Anthropic isn't configured.
export function getAiProvider() {
  if (env.anthropicApiKey) {
    return anthropicProvider
  }

  if (env.groqApiKey) {
    return groqProvider
  }

  return mockProvider
}
