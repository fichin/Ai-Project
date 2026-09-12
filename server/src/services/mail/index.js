import { logProvider } from './providers/logProvider.js'

// Mirrors the AI provider factory: a single switch point. Swapping in a real
// SMTP/API-based provider later only requires changing this function.
export function getMailProvider() {
  return logProvider
}

export function sendEmail(message) {
  return getMailProvider().send(message)
}
