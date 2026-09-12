import { getAiProvider } from './ai/index.js'
import { AiProviderError } from './ai/AiProviderError.js'
import {
  getConversationByIdForUser,
  createConversation,
  touchConversation,
  setConversationTitle,
} from '../db/conversationsRepository.js'
import { countMessages, createMessage } from '../db/messagesRepository.js'
import { titleFromMessage } from '../utils/titleFromMessage.js'

export class ConversationNotFoundError extends Error {
  constructor() {
    super('Conversation not found.')
    this.name = 'ConversationNotFoundError'
    this.status = 404
  }
}

export async function generateChatReply(message) {
  const provider = getAiProvider()

  try {
    return await provider.generateReply(message)
  } catch (error) {
    console.error(`[ai:${provider.name}] failed to generate a reply:`, error)
    throw new AiProviderError('The AI provider is currently unavailable. Please try again later.')
  }
}

// conversationIdInput missing/null => start a new conversation automatically
// (keeps /api/chat usable from the Assistant's empty state without forcing a
// POST /api/conversations first). A non-null id must belong to userId.
export function resolveConversation(conversationIdInput, userId) {
  if (conversationIdInput === undefined || conversationIdInput === null) {
    return createConversation(userId, null)
  }

  const conversation = getConversationByIdForUser(conversationIdInput, userId)
  if (!conversation) {
    throw new ConversationNotFoundError()
  }

  return conversation
}

export async function sendChatMessage(conversationId, message) {
  const isFirstMessage = countMessages(conversationId) === 0

  createMessage(conversationId, 'user', message)

  if (isFirstMessage) {
    setConversationTitle(conversationId, titleFromMessage(message))
  }

  const reply = await generateChatReply(message)

  createMessage(conversationId, 'assistant', reply)
  touchConversation(conversationId)

  return reply
}
