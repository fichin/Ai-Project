import { env } from '../../config/env.js'
import { mockProvider } from './providers/mockProvider.js'
import { anthropicProvider } from './providers/anthropicProvider.js'

// Single switch point: once ANTHROPIC_API_KEY is set in the environment,
// this automatically starts returning the real provider — no other code
// needs to change.
export function getAiProvider() {
  if (env.anthropicApiKey) {
    return anthropicProvider
  }

  return mockProvider
}
