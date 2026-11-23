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

// 503, not 429: this isn't "you personally are going too fast", it's "the
// whole demo is out of AI quota for today" — a service-availability state
// every caller shares, not something retrying sooner would fix.
export class GlobalAiQuotaError extends Error {
  constructor() {
    super(GLOBAL_DAILY_AI_LIMIT_MESSAGE)
    this.name = 'GlobalAiQuotaError'
    this.status = 503
  }
}

// Shared by sendChatMessage below (implicit creation from /api/chat)
// and POST /api/conversations (explicit creation) — both create a row in
// the same table against the same per-user cap.
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

// conversationId null => start a new conversation (keeps /api/chat usable
// from the Assistant's empty state). It is only created once the AI has
// replied, so a failed call leaves no empty conversation eating the quota.
//
// The daily caps are COUNT queries over messages in a rolling 24h window, so
// there's no separate counter to reset. Two concurrent sends to the same
// conversation can both pass the checks and both see the same history.
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
