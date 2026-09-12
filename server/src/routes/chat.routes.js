import { Router } from 'express'
import { resolveConversation, sendChatMessage } from '../services/chatService.js'

const router = Router()

router.post('/chat', async (req, res, next) => {
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

  try {
    const conversation = resolveConversation(conversationIdInput, req.user.id)
    const reply = await sendChatMessage(conversation.id, message)
    res.json({ reply, receivedMessage: message, conversationId: conversation.id })
  } catch (error) {
    next(error)
  }
})

export default router
