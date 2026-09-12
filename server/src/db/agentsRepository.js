import { getDb } from './index.js'
import { getProjectByIdForUser } from './projectsRepository.js'

export const ALLOWED_STATUSES = ['active', 'paused', 'draft']

export function listAgentsByUser(userId) {
  return getDb()
    .prepare('SELECT * FROM agents WHERE user_id = ? ORDER BY updated_at DESC')
    .all(userId)
}

export function getAgentByIdForUser(id, userId) {
  return getDb().prepare('SELECT * FROM agents WHERE id = ? AND user_id = ?').get(id, userId)
}

export function projectExistsForUser(projectId, userId) {
  return Boolean(getProjectByIdForUser(projectId, userId))
}

export function createAgent(userId, { name, description, status, projectId }) {
  const db = getDb()
  const result = db
    .prepare('INSERT INTO agents (user_id, project_id, name, description, status) VALUES (?, ?, ?, ?, ?)')
    .run(userId, projectId ?? null, name, description ?? null, status ?? 'draft')

  return getAgentByIdForUser(Number(result.lastInsertRowid), userId)
}

export function updateAgent(id, userId, fields) {
  const current = getAgentByIdForUser(id, userId)
  if (!current) {
    return null
  }

  const name = fields.name ?? current.name
  const description = fields.description !== undefined ? fields.description : current.description
  const status = fields.status ?? current.status
  const projectId = fields.projectId !== undefined ? fields.projectId : current.project_id

  getDb()
    .prepare(
      `UPDATE agents
       SET name = ?, description = ?, status = ?, project_id = ?, updated_at = datetime('now')
       WHERE id = ? AND user_id = ?`,
    )
    .run(name, description, status, projectId, id, userId)

  return getAgentByIdForUser(id, userId)
}

export function deleteAgent(id, userId) {
  const result = getDb().prepare('DELETE FROM agents WHERE id = ? AND user_id = ?').run(id, userId)
  return result.changes > 0
}
