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
  countMessages,
  countAssistantMessages,
  countAssistantMessagesByUserSince,
  countAssistantMessagesSince,
  createMessage,
} from '../db/messagesRepository.js'
import { utcTextDaysAgo } from '../db/postgresClient.js'
import { titleFromMessage } from '../utils/titleFromMessage.js'
import { env } from '../config/env.js'
import {
  MAX_ASSISTANT_MESSAGES_PER_CONVERSATION,
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

// Shared by resolveConversation below (implicit creation from /api/chat)
// and POST /api/conversations (explicit creation) — both create a row in
// the same table against the same per-user cap.
export async function assertUnderConversationLimit(userId) {
  const count = await countConversationsByUser(userId)
  if (count >= env.aiUsageCaps.maxConversationsPerUser) {
    throw new ConversationQuotaError()
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
    await assertUnderConversationLimit(userId)
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
//
// The per-user and global daily caps below are both derived live from
// COUNT queries over the existing messages table (rolling 24h window via
// utcTextDaysAgo(1), not calendar-day) rather than a separate counter that
// would need resetting at midnight or incrementing/decrementing in two
// places. At this app's scale that's a couple of cheap indexed-by-nothing
// COUNT(*) queries per chat request, not a real cost — if this ever needed
// to handle meaningfully more traffic, a cached/materialized counter would
// be the next step, but that's not a problem this app has today.
export async function sendChatMessage(conversationId, message, userId) {
  const assistantMessageCount = await countAssistantMessages(conversationId)
  if (assistantMessageCount >= MAX_ASSISTANT_MESSAGES_PER_CONVERSATION) {
    throw new ConversationLimitError()
  }

  const since = utcTextDaysAgo(1)

  const globalAiCallsToday = await countAssistantMessagesSince(since)
  if (globalAiCallsToday >= env.aiUsageCaps.maxAiCallsPerDay) {
    throw new GlobalAiQuotaError()
  }

  const userAiMessagesToday = await countAssistantMessagesByUserSince(userId, since)
  if (userAiMessagesToday >= env.aiUsageCaps.maxAiMessagesPerUserPerDay) {
    throw new UserAiQuotaError()
  }

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
