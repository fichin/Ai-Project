import { Router } from 'express'
import {
  listAgentsByUser,
  createAgent,
  updateAgent,
  deleteAgent,
  projectExistsForUser,
  ALLOWED_STATUSES,
} from '../db/agentsRepository.js'

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
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function parseId(param) {
  const id = Number(param)
  return Number.isInteger(id) && id > 0 ? id : null
}

function validateProjectId(projectIdInput, userId) {
  if (projectIdInput === undefined || projectIdInput === null) {
    return { value: null }
  }

  const id = Number(projectIdInput)
  if (!Number.isInteger(id) || id <= 0) {
    return { error: '"project_id" must be a positive integer or null.' }
  }

  if (!projectExistsForUser(id, userId)) {
    return { error: '"project_id" does not reference an existing project.' }
  }

  return { value: id }
}

router.get('/agents', (req, res) => {
  const userId = req.user.id
  const rows = listAgentsByUser(userId)
  res.json(rows.map(toAgentDto))
})

router.post('/agents', (req, res) => {
  const { name, description, status, project_id: projectIdInput } = req.body ?? {}

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
  const projectResult = validateProjectId(projectIdInput, userId)
  if (projectResult.error) {
    return res.status(400).json({ error: projectResult.error })
  }

  const agent = createAgent(userId, {
    name: name.trim(),
    description,
    status,
    projectId: projectResult.value,
  })
  res.status(201).json(toAgentDto(agent))
})

router.patch('/agents/:id', (req, res) => {
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

  if (projectIdInput !== undefined) {
    const projectResult = validateProjectId(projectIdInput, userId)
    if (projectResult.error) {
      return res.status(400).json({ error: projectResult.error })
    }
    fields.projectId = projectResult.value
  }

  if (Object.keys(fields).length === 0) {
    return res.status(400).json({ error: 'At least one editable field must be provided.' })
  }

  const updated = updateAgent(id, userId, fields)

  if (!updated) {
    return res.status(404).json({ error: 'Agent not found.' })
  }

  res.json(toAgentDto(updated))
})

router.delete('/agents/:id', (req, res) => {
  const id = parseId(req.params.id)
  if (!id) {
    return res.status(400).json({ error: 'Invalid agent id.' })
  }

  const userId = req.user.id
  const deleted = deleteAgent(id, userId)

  if (!deleted) {
    return res.status(404).json({ error: 'Agent not found.' })
  }

  res.status(204).end()
})

export default router
