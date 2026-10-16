import { Router } from 'express'
import {
  listConversationsByUser,
  getConversationByIdForUser,
  createConversation,
  deleteConversation,
} from '../db/conversationsRepository.js'
import { listMessagesByConversation } from '../db/messagesRepository.js'
import { assertUnderConversationLimit } from '../services/chatService.js'
import { asyncHandler } from '../utils/asyncHandler.js'

const router = Router()

function toConversationDto(row) {
  return {
    id: row.id,
    title: row.title,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    messageCount: row.message_count ?? 0,
  }
}

function toMessageDto(row) {
  return {
    id: row.id,
    role: row.role,
    content: row.content,
    createdAt: row.created_at,
  }
}

function parseId(param) {
  const id = Number(param)
  return Number.isInteger(id) && id > 0 ? id : null
}

router.get(
  '/conversations',
  asyncHandler(async (req, res) => {
    const userId = req.user.id
    const rows = await listConversationsByUser(userId)
    res.json(rows.map(toConversationDto))
  }),
)

router.post(
  '/conversations',
  asyncHandler(async (req, res) => {
    const { title } = req.body ?? {}

    if (title !== undefined && typeof title !== 'string') {
      return res.status(400).json({ error: '"title" must be a string.' })
    }

    const userId = req.user.id
    await assertUnderConversationLimit(userId)
    const trimmedTitle = typeof title === 'string' && title.trim().length > 0 ? title.trim() : null
    const conversation = await createConversation(userId, trimmedTitle)
    res.status(201).json(toConversationDto(conversation))
  }),
)

router.get(
  '/conversations/:id/messages',
  asyncHandler(async (req, res) => {
    const id = parseId(req.params.id)
    if (!id) {
      return res.status(400).json({ error: 'Invalid conversation id.' })
    }

    const userId = req.user.id
    const conversation = await getConversationByIdForUser(id, userId)
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found.' })
    }

    const messages = await listMessagesByConversation(id)
    res.json(messages.map(toMessageDto))
  }),
)

router.delete(
  '/conversations/:id',
  asyncHandler(async (req, res) => {
    const id = parseId(req.params.id)
    if (!id) {
      return res.status(400).json({ error: 'Invalid conversation id.' })
    }

    const userId = req.user.id
    const deleted = await deleteConversation(id, userId)

    if (!deleted) {
      return res.status(404).json({ error: 'Conversation not found.' })
    }

    res.status(204).end()
  }),
)

export default router
