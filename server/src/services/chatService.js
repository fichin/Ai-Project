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
export async function resolveConversation(conversationIdInput, userId) {
  if (conversationIdInput === undefined || conversationIdInput === null) {
    return createConversation(userId, null)
  }

  const conversation = await getConversationByIdForUser(conversationIdInput, userId)
  if (!conversation) {
    throw new ConversationNotFoundError()
  }

  return conversation
}

// Returns the persisted rows (not just the reply text) so callers have real
// database ids to key off of — the frontend uses these instead of throwaway
// client-generated ids, which is what lets a future streaming endpoint patch
// a specific in-flight message by id instead of guessing at ordering.
export async function sendChatMessage(conversationId, message) {
  const isFirstMessage = (await countMessages(conversationId)) === 0

  const userMessage = await createMessage(conversationId, 'user', message)

  if (isFirstMessage) {
    await setConversationTitle(conversationId, titleFromMessage(message))
  }

  const reply = await generateChatReply(message)

  const assistantMessage = await createMessage(conversationId, 'assistant', reply)
  await touchConversation(conversationId)

  return { userMessage, assistantMessage }
}
