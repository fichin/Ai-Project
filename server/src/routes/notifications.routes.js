import { Router } from 'express'
import {
  listNotificationsForUser,
  getUnreadCountForUser,
  markNotificationRead,
  markAllNotificationsRead,
} from '../db/notificationsRepository.js'
import { describeNotification } from '../config/notifications.js'
import { formatRelativeTime } from '../utils/formatRelativeTime.js'
import { asyncHandler } from '../utils/asyncHandler.js'

const router = Router()

function toNotificationDto(row) {
  return {
    id: row.id,
    type: row.type,
    entityType: row.entity_type,
    entityId: row.entity_id,
    entityName: row.entity_name,
    message: describeNotification(row.type, row.entity_name),
    isRead: Boolean(row.read_at),
    createdAt: row.created_at,
    relativeTime: formatRelativeTime(row.created_at),
  }
}

function parseId(param) {
  const id = Number(param)
  return Number.isInteger(id) && id > 0 ? id : null
}

router.get(
  '/notifications',
  asyncHandler(async (req, res) => {
    const userId = req.user.id
    const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 100)
    const rows = await listNotificationsForUser(userId, limit)
    res.json(rows.map(toNotificationDto))
  }),
)

router.get(
  '/notifications/unread-count',
  asyncHandler(async (req, res) => {
    res.json({ count: await getUnreadCountForUser(req.user.id) })
  }),
)

router.patch(
  '/notifications/read-all',
  asyncHandler(async (req, res) => {
    await markAllNotificationsRead(req.user.id)
    res.status(204).end()
  }),
)

router.patch(
  '/notifications/:id/read',
  asyncHandler(async (req, res) => {
    const id = parseId(req.params.id)
    if (!id) {
      return res.status(400).json({ error: 'Invalid notification id.' })
    }

    const updated = await markNotificationRead(id, req.user.id)
    if (!updated) {
      return res.status(404).json({ error: 'Notification not found.' })
    }

    res.json(toNotificationDto(updated))
  }),
)

export default router
