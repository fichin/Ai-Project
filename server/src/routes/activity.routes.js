import { Router } from 'express'
import { listActivityForUser } from '../db/activityRepository.js'
import { describeActivity } from '../config/activity.js'
import { formatRelativeTime } from '../utils/formatRelativeTime.js'
import { asyncHandler } from '../utils/asyncHandler.js'

const router = Router()

function toActivityDto(row) {
  return {
    id: row.id,
    type: row.type,
    entityType: row.entity_type,
    entityId: row.entity_id,
    entityName: row.entity_name,
    message: describeActivity(row.type, row.entity_name),
    createdAt: row.created_at,
    relativeTime: formatRelativeTime(row.created_at),
  }
}

router.get(
  '/activity',
  asyncHandler(async (req, res) => {
    const userId = req.user.id
    const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 100)
    const rows = await listActivityForUser(userId, limit)
    res.json(rows.map(toActivityDto))
  }),
)

export default router
