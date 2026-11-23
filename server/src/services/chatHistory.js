import { MAX_HISTORY_CHARS } from '../config/chat.js'

// Builds the message list sent to the model: the newest history that fits the
// budget, followed by the new user message.
export function buildModelMessages(history, newMessage, { maxChars = MAX_HISTORY_CHARS } = {}) {
  let used = newMessage.length
  const newestFirst = []

  for (let i = history.length - 1; i >= 0; i--) {
    const { role, content } = history[i]
    // Stop at the first message that doesn't fit rather than skipping it, so
    // the model never sees a conversation with a hole in the middle.
    if (used + content.length > maxChars) break
    newestFirst.push({ role, content })
    used += content.length
  }

  const kept = newestFirst.reverse()

  // Anthropic requires the conversation to start with a user turn.
  while (kept.length > 0 && kept[0].role !== 'user') {
    kept.shift()
  }

  return [...kept, { role: 'user', content: newMessage }]
}
