import { Router } from 'express'
import {
  listAgentsByUser,
  getAgentByIdForUser,
  createAgent,
  updateAgent,
  deleteAgent,
  projectExistsForUser,
  ALLOWED_STATUSES,
} from '../db/agentsRepository.js'
import { formatRelativeTime } from '../utils/formatRelativeTime.js'
import { logActivity } from '../db/activityRepository.js'
import { ACTIVITY_TYPES } from '../config/activity.js'
import { createNotification } from '../db/notificationsRepository.js'
import { NOTIFICATION_TYPES } from '../config/notifications.js'
import { MAX_NAME_LENGTH, MAX_DESCRIPTION_LENGTH } from '../config/limits.js'
import { asyncHandler } from '../utils/asyncHandler.js'

const router = Router()

// No icon column exists (or is needed) in the agents table — derive a stable,
// visually varied icon key from the agent's own id so the existing UI keeps
// working unchanged.
const ICON_ROTATION = ['research', 'code', 'support', 'pen', 'chart', 'shield', 'clipboard', 'server']

function iconForAgentId(id) {
  return ICON_ROTATION[(id - 1) % ICON_ROTATION.length]
}

function toAgentDto(row) {
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? '',
    status: row.status,
    icon: iconForAgentId(row.id),
    projectId: row.project_id,
    projectName: row.project_name ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    lastUpdated: formatRelativeTime(row.updated_at),
  }
}

function parseId(param) {
  const id = Number(param)
  return Number.isInteger(id) && id > 0 ? id : null
}

async function validateProjectId(projectIdInput, userId) {
  if (projectIdInput === undefined || projectIdInput === null) {
    return { value: null }
  }

  const id = Number(projectIdInput)
  if (!Number.isInteger(id) || id <= 0) {
    return { error: '"project_id" must be a positive integer or null.' }
  }

  if (!(await projectExistsForUser(id, userId))) {
    return { error: '"project_id" does not reference an existing project.' }
  }

  return { value: id }
}

router.get(
  '/agents',
  asyncHandler(async (req, res) => {
    const userId = req.user.id
    const rows = await listAgentsByUser(userId)
    res.json(rows.map(toAgentDto))
  }),
)

router.get(
  '/agents/:id',
  asyncHandler(async (req, res) => {
    const id = parseId(req.params.id)
    if (!id) {
      return res.status(400).json({ error: 'Invalid agent id.' })
    }

    const userId = req.user.id
    const agent = await getAgentByIdForUser(id, userId)

    if (!agent) {
      return res.status(404).json({ error: 'Agent not found.' })
    }

    res.json(toAgentDto(agent))
  }),
)

router.post(
  '/agents',
  asyncHandler(async (req, res) => {
    const { name, description, status, project_id: projectIdInput } = req.body ?? {}

    if (typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json({ error: 'A non-empty "name" field is required.' })
    }
    if (name.trim().length > MAX_NAME_LENGTH) {
      return res.status(400).json({ error: `"name" must be at most ${MAX_NAME_LENGTH} characters.` })
    }
    if (description !== undefined && typeof description !== 'string') {
      return res.status(400).json({ error: '"description" must be a string.' })
    }
    if (description !== undefined && description.length > MAX_DESCRIPTION_LENGTH) {
      return res.status(400).json({ error: `"description" must be at most ${MAX_DESCRIPTION_LENGTH} characters.` })
    }
    if (status !== undefined && !ALLOWED_STATUSES.includes(status)) {
      return res.status(400).json({ error: `"status" must be one of: ${ALLOWED_STATUSES.join(', ')}.` })
    }

    const userId = req.user.id
    const projectResult = await validateProjectId(projectIdInput, userId)
    if (projectResult.error) {
      return res.status(400).json({ error: projectResult.error })
    }

    const agent = await createAgent(userId, {
      name: name.trim(),
      description,
      status,
      projectId: projectResult.value,
    })
    await logActivity(userId, {
      type: ACTIVITY_TYPES.AGENT_CREATED,
      entityType: 'agent',
      entityId: agent.id,
      entityName: agent.name,
    })
    await createNotification(userId, {
      type: NOTIFICATION_TYPES.AGENT_CREATED,
      entityType: 'agent',
      entityId: agent.id,
      entityName: agent.name,
    })
    res.status(201).json(toAgentDto(agent))
  }),
)

router.patch(
  '/agents/:id',
  asyncHandler(async (req, res) => {
    const id = parseId(req.params.id)
    if (!id) {
      return res.status(400).json({ error: 'Invalid agent id.' })
    }

    const userId = req.user.id
    const { name, description, status, project_id: projectIdInput } = req.body ?? {}
    const fields = {}

    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim().length === 0) {
        return res.status(400).json({ error: '"name" must be a non-empty string.' })
      }
      if (name.trim().length > MAX_NAME_LENGTH) {
        return res.status(400).json({ error: `"name" must be at most ${MAX_NAME_LENGTH} characters.` })
      }
      fields.name = name.trim()
    }

    if (description !== undefined) {
      if (typeof description !== 'string') {
        return res.status(400).json({ error: '"description" must be a string.' })
      }
      if (description.length > MAX_DESCRIPTION_LENGTH) {
        return res.status(400).json({ error: `"description" must be at most ${MAX_DESCRIPTION_LENGTH} characters.` })
      }
      fields.description = description
    }

    if (status !== undefined) {
      if (!ALLOWED_STATUSES.includes(status)) {
        return res.status(400).json({ error: `"status" must be one of: ${ALLOWED_STATUSES.join(', ')}.` })
      }
      fields.status = status
    }

    if (projectIdInput !== undefined) {
      const projectResult = await validateProjectId(projectIdInput, userId)
      if (projectResult.error) {
        return res.status(400).json({ error: projectResult.error })
      }
      fields.projectId = projectResult.value
    }

    if (Object.keys(fields).length === 0) {
      return res.status(400).json({ error: 'At least one editable field must be provided.' })
    }

    const updated = await updateAgent(id, userId, fields)

    if (!updated) {
      return res.status(404).json({ error: 'Agent not found.' })
    }

    await logActivity(userId, {
      type: ACTIVITY_TYPES.AGENT_UPDATED,
      entityType: 'agent',
      entityId: updated.id,
      entityName: updated.name,
    })
    await createNotification(userId, {
      type: NOTIFICATION_TYPES.AGENT_UPDATED,
      entityType: 'agent',
      entityId: updated.id,
      entityName: updated.name,
    })
    res.json(toAgentDto(updated))
  }),
)

router.delete(
  '/agents/:id',
  asyncHandler(async (req, res) => {
    const id = parseId(req.params.id)
    if (!id) {
      return res.status(400).json({ error: 'Invalid agent id.' })
    }

    const userId = req.user.id
    // Fetched (not just deleted-by-id) so the activity entry can still name
    // the agent after its row is gone.
    const agent = await getAgentByIdForUser(id, userId)
    if (!agent) {
      return res.status(404).json({ error: 'Agent not found.' })
    }

    const deleted = await deleteAgent(id, userId)
    if (!deleted) {
      return res.status(404).json({ error: 'Agent not found.' })
    }

    await logActivity(userId, {
      type: ACTIVITY_TYPES.AGENT_DELETED,
      entityType: 'agent',
      entityId: agent.id,
      entityName: agent.name,
    })
    await createNotification(userId, {
      type: NOTIFICATION_TYPES.AGENT_DELETED,
      entityType: 'agent',
      entityId: agent.id,
      entityName: agent.name,
    })
    res.status(204).end()
  }),
)

export default router
