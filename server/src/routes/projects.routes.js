import { Router } from 'express'
import {
  listProjectsByUser,
  getProjectByIdForUser,
  createProject,
  updateProject,
  deleteProject,
  ALLOWED_STATUSES,
} from '../db/projectsRepository.js'
import { formatRelativeTime } from '../utils/formatRelativeTime.js'
import { logActivity } from '../db/activityRepository.js'
import { ACTIVITY_TYPES } from '../config/activity.js'
import { createNotification } from '../db/notificationsRepository.js'
import { NOTIFICATION_TYPES } from '../config/notifications.js'
import { asyncHandler } from '../utils/asyncHandler.js'

const router = Router()

function toProjectDto(row) {
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? '',
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    lastUpdated: formatRelativeTime(row.updated_at),
    agentCount: row.agent_count ?? 0,
  }
}

function parseId(param) {
  const id = Number(param)
  return Number.isInteger(id) && id > 0 ? id : null
}

router.get(
  '/projects',
  asyncHandler(async (req, res) => {
    const userId = req.user.id
    const rows = await listProjectsByUser(userId)
    res.json(rows.map(toProjectDto))
  }),
)

router.get(
  '/projects/:id',
  asyncHandler(async (req, res) => {
    const id = parseId(req.params.id)
    if (!id) {
      return res.status(400).json({ error: 'Invalid project id.' })
    }

    const userId = req.user.id
    const project = await getProjectByIdForUser(id, userId)

    if (!project) {
      return res.status(404).json({ error: 'Project not found.' })
    }

    res.json(toProjectDto(project))
  }),
)

router.post(
  '/projects',
  asyncHandler(async (req, res) => {
    const { name, description, status } = req.body ?? {}

    if (typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json({ error: 'A non-empty "name" field is required.' })
    }
    if (description !== undefined && typeof description !== 'string') {
      return res.status(400).json({ error: '"description" must be a string.' })
    }
    if (status !== undefined && !ALLOWED_STATUSES.includes(status)) {
      return res.status(400).json({ error: `"status" must be one of: ${ALLOWED_STATUSES.join(', ')}.` })
    }

    const userId = req.user.id
    const project = await createProject(userId, { name: name.trim(), description, status })
    await logActivity(userId, {
      type: ACTIVITY_TYPES.PROJECT_CREATED,
      entityType: 'project',
      entityId: project.id,
      entityName: project.name,
    })
    await createNotification(userId, {
      type: NOTIFICATION_TYPES.PROJECT_CREATED,
      entityType: 'project',
      entityId: project.id,
      entityName: project.name,
    })
    res.status(201).json(toProjectDto(project))
  }),
)

router.patch(
  '/projects/:id',
  asyncHandler(async (req, res) => {
    const id = parseId(req.params.id)
    if (!id) {
      return res.status(400).json({ error: 'Invalid project id.' })
    }

    const { name, description, status } = req.body ?? {}
    const fields = {}

    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim().length === 0) {
        return res.status(400).json({ error: '"name" must be a non-empty string.' })
      }
      fields.name = name.trim()
    }

    if (description !== undefined) {
      if (typeof description !== 'string') {
        return res.status(400).json({ error: '"description" must be a string.' })
      }
      fields.description = description
    }

    if (status !== undefined) {
      if (!ALLOWED_STATUSES.includes(status)) {
        return res.status(400).json({ error: `"status" must be one of: ${ALLOWED_STATUSES.join(', ')}.` })
      }
      fields.status = status
    }

    if (Object.keys(fields).length === 0) {
      return res.status(400).json({ error: 'At least one editable field must be provided.' })
    }

    const userId = req.user.id
    const updated = await updateProject(id, userId, fields)

    if (!updated) {
      return res.status(404).json({ error: 'Project not found.' })
    }

    await logActivity(userId, {
      type: ACTIVITY_TYPES.PROJECT_UPDATED,
      entityType: 'project',
      entityId: updated.id,
      entityName: updated.name,
    })
    await createNotification(userId, {
      type: NOTIFICATION_TYPES.PROJECT_UPDATED,
      entityType: 'project',
      entityId: updated.id,
      entityName: updated.name,
    })
    res.json(toProjectDto(updated))
  }),
)

router.delete(
  '/projects/:id',
  asyncHandler(async (req, res) => {
    const id = parseId(req.params.id)
    if (!id) {
      return res.status(400).json({ error: 'Invalid project id.' })
    }

    const userId = req.user.id
    // Fetched (not just deleted-by-id) so the activity entry can still name
    // the project after its row is gone.
    const project = await getProjectByIdForUser(id, userId)
    if (!project) {
      return res.status(404).json({ error: 'Project not found.' })
    }

    const deleted = await deleteProject(id, userId)
    if (!deleted) {
      return res.status(404).json({ error: 'Project not found.' })
    }

    await logActivity(userId, {
      type: ACTIVITY_TYPES.PROJECT_DELETED,
      entityType: 'project',
      entityId: project.id,
      entityName: project.name,
    })
    await createNotification(userId, {
      type: NOTIFICATION_TYPES.PROJECT_DELETED,
      entityType: 'project',
      entityId: project.id,
      entityName: project.name,
    })
    res.status(204).end()
  }),
)

export default router
