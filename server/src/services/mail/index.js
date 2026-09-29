import { env } from '../../config/env.js'
import { logProvider } from './providers/logProvider.js'
import { resendProvider } from './providers/resendProvider.js'

// Mirrors the AI provider factory: a single switch point. Real emails only
// go out once RESEND_API_KEY is set AND the app is running in production —
// local/dev environments always keep the console-log + dev-outbox provider
// regardless of whether a key happens to be set, so local workflow (reading
// verification/reset links back out of the dev outbox) never changes.
export function getMailProvider() {
  if (env.resendApiKey && env.nodeEnv === 'production') {
    return resendProvider
  }

  return logProvider
}

export function sendEmail(message) {
  return getMailProvider().send(message)
}
