import { Router } from 'express'
import { resolveConversation, sendChatMessage } from '../services/chatService.js'
import { asyncHandler } from '../utils/asyncHandler.js'

const router = Router()

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
  asyncHandler(async (req, res) => {
    const { message, conversationId: conversationIdInput } = req.body ?? {}

    if (typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({ error: 'A non-empty "message" field is required.' })
    }

    if (conversationIdInput !== undefined && conversationIdInput !== null) {
      const numericId = Number(conversationIdInput)
      if (!Number.isInteger(numericId) || numericId <= 0) {
        return res.status(400).json({ error: 'Invalid conversationId.' })
      }
    }

    const conversation = await resolveConversation(conversationIdInput, req.user.id)
    const { userMessage, assistantMessage } = await sendChatMessage(conversation.id, message)
    res.json({
      conversationId: conversation.id,
      userMessage: toMessageDto(userMessage),
      assistantMessage: toMessageDto(assistantMessage),
    })
  }),
)

export default router
