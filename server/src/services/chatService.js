import { getAiProvider } from './ai/index.js'
import { AiProviderError } from './ai/AiProviderError.js'
import {
  getConversationByIdForUser,
  createConversation,
  countConversationsByUser,
  touchConversation,
  setConversationTitle,
} from '../db/conversationsRepository.js'
import {
  countAssistantMessages,
  countAssistantMessagesByUserSince,
  countAssistantMessagesSince,
  createMessage,
  listMessagesByConversation,
} from '../db/messagesRepository.js'
import { utcTextDaysAgo, withTransaction } from '../db/postgresClient.js'
import { buildModelMessages } from './chatHistory.js'
import { titleFromMessage } from '../utils/titleFromMessage.js'
import { env } from '../config/env.js'
import {
  MAX_ASSISTANT_MESSAGES_PER_CONVERSATION,
  SYSTEM_PROMPT,
  CONVERSATION_LIMIT_MESSAGE,
  CONVERSATION_COUNT_LIMIT_MESSAGE,
  USER_DAILY_AI_LIMIT_MESSAGE,
  GLOBAL_DAILY_AI_LIMIT_MESSAGE,
} from '../config/chat.js'

export class ConversationNotFoundError extends Error {
  constructor() {
    super('Conversation not found.')
    this.name = 'ConversationNotFoundError'
    this.status = 404
  }
}

export class ConversationLimitError extends Error {
  constructor() {
    super(CONVERSATION_LIMIT_MESSAGE)
    this.name = 'ConversationLimitError'
    this.status = 429
  }
}

export class ConversationQuotaError extends Error {
  constructor() {
    super(CONVERSATION_COUNT_LIMIT_MESSAGE)
    this.name = 'ConversationQuotaError'
    this.status = 429
  }
}

export class UserAiQuotaError extends Error {
  constructor() {
    super(USER_DAILY_AI_LIMIT_MESSAGE)
    this.name = 'UserAiQuotaError'
    this.status = 429
  }
}

// 503, not 429: the whole demo is out of quota, so retrying sooner won't help.
export class GlobalAiQuotaError extends Error {
  constructor() {
    super(GLOBAL_DAILY_AI_LIMIT_MESSAGE)
    this.name = 'GlobalAiQuotaError'
    this.status = 503
  }
}

export async function assertUnderConversationLimit(userId, count = countConversationsByUser) {
  if ((await count(userId)) >= env.aiUsageCaps.maxConversationsPerUser) {
    throw new ConversationQuotaError()
  }
}

export async function generateChatReply(messages, provider = getAiProvider()) {
  let reply
  try {
    reply = await provider.generateReply({ system: SYSTEM_PROMPT, messages })
  } catch (error) {
    console.error(`[ai:${provider.name}] failed to generate a reply:`, error)
    throw new AiProviderError('The AI provider is currently unavailable. Please try again later.')
  }

  // Saving a blank assistant message would also burn one of the user's quota slots.
  if (typeof reply !== 'string' || reply.trim() === '') {
    console.error(`[ai:${provider.name}] returned an empty reply`)
    throw new AiProviderError('The AI provider returned an empty reply. Please try again.')
  }
  return reply
}

export const defaultChatDeps = {
  getConversationByIdForUser,
  countConversationsByUser,
  countAssistantMessages,
  countAssistantMessagesSince,
  countAssistantMessagesByUserSince,
  listMessagesByConversation,
  createConversation,
  createMessage,
  setConversationTitle,
  touchConversation,
  withTransaction,
  generateChatReply,
}

// A new conversation is only created after the AI replies, so a failed call
// leaves no empty row eating the quota. Known race: two concurrent sends to one
// conversation can both pass the caps and see the same history.
export async function sendChatMessage({ conversationId, message, userId }, deps = defaultChatDeps) {
  let conversation = null
  if (conversationId !== null && conversationId !== undefined) {
    conversation = await deps.getConversationByIdForUser(conversationId, userId)
    if (!conversation) throw new ConversationNotFoundError()

    if ((await deps.countAssistantMessages(conversation.id)) >= MAX_ASSISTANT_MESSAGES_PER_CONVERSATION) {
      throw new ConversationLimitError()
    }
  } else {
    await assertUnderConversationLimit(userId, deps.countConversationsByUser)
  }

  const since = utcTextDaysAgo(1)
  if ((await deps.countAssistantMessagesSince(since)) >= env.aiUsageCaps.maxAiCallsPerDay) {
    throw new GlobalAiQuotaError()
  }
  if ((await deps.countAssistantMessagesByUserSince(userId, since)) >= env.aiUsageCaps.maxAiMessagesPerUserPerDay) {
    throw new UserAiQuotaError()
  }

  const history = conversation ? await deps.listMessagesByConversation(conversation.id) : []
  const reply = await deps.generateChatReply(buildModelMessages(history, message))

  // Only now, after the slow AI call, do we borrow a connection, so the
  // transaction stays short and can't tie up the pool while the AI thinks.
  return deps.withTransaction(async (tx) => {
    const conv = conversation ?? (await deps.createConversation(userId, null, tx))
    const userMessage = await deps.createMessage(conv.id, 'user', message, tx)
    if (history.length === 0) {
      await deps.setConversationTitle(conv.id, titleFromMessage(message), tx)
    }
    const assistantMessage = await deps.createMessage(conv.id, 'assistant', reply, tx)
    await deps.touchConversation(conv.id, tx)
    return { conversationId: conv.id, userMessage, assistantMessage }
  })
}
