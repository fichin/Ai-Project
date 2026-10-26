import { Router } from 'express'
import { resolveConversation, sendChatMessage } from '../services/chatService.js'
import { chatLimiter } from '../middleware/rateLimiters.js'
import { MAX_CHAT_MESSAGE_LENGTH } from '../config/limits.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { getAiProvider } from '../services/ai/index.js'
import { mockProvider } from '../services/ai/providers/mockProvider.js'

const router = Router()

// Lets the chat UI tell users when replies come from the mock provider
// (no API key configured). Only a boolean is exposed — which real provider
// is in use isn't the client's concern.
router.get('/chat/status', (req, res) => {
  res.json({ simulated: getAiProvider() === mockProvider })
})

// Same DTO shape as GET /conversations/:id/messages (see
// conversations.routes.js) so the frontend can treat a freshly-sent message
// identically to one loaded from history — same id space, same fields.
function toMessageDto(row) {
  return {
    id: row.id,
    role: row.role,
    content: row.content,
    createdAt: row.created_at,
  }
}

router.post(
  '/chat',
  chatLimiter,
  asyncHandler(async (req, res) => {
    const { message, conversationId: conversationIdInput } = req.body ?? {}

    if (typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({ error: 'A non-empty "message" field is required.' })
    }
    if (message.length > MAX_CHAT_MESSAGE_LENGTH) {
      return res.status(400).json({ error: `"message" must be at most ${MAX_CHAT_MESSAGE_LENGTH} characters.` })
    }

    if (conversationIdInput !== undefined && conversationIdInput !== null) {
      const numericId = Number(conversationIdInput)
      if (!Number.isInteger(numericId) || numericId <= 0) {
        return res.status(400).json({ error: 'Invalid conversationId.' })
      }
    }

    const conversation = await resolveConversation(conversationIdInput, req.user.id)
    const { userMessage, assistantMessage } = await sendChatMessage(conversation.id, message, req.user.id)
    res.json({
      conversationId: conversation.id,
      userMessage: toMessageDto(userMessage),
      assistantMessage: toMessageDto(assistantMessage),
    })
  }),
)

export default router
