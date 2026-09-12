import { getDb } from './index.js'

export const ALLOWED_STATUSES = ['active', 'planning', 'completed', 'archived']

export function listProjectsByUser(userId) {
  return getDb()
    .prepare(
      `SELECT p.*, COUNT(a.id) AS agent_count
       FROM projects p
       LEFT JOIN agents a ON a.project_id = p.id
       WHERE p.user_id = ?
       GROUP BY p.id
       ORDER BY p.updated_at DESC`,
    )
    .all(userId)
}

export function getProjectByIdForUser(id, userId) {
  return getDb()
    .prepare(
      `SELECT p.*, COUNT(a.id) AS agent_count
       FROM projects p
       LEFT JOIN agents a ON a.project_id = p.id
       WHERE p.id = ? AND p.user_id = ?
       GROUP BY p.id`,
    )
    .get(id, userId)
}

export function createProject(userId, { name, description, status }) {
  const db = getDb()
  const result = db
    .prepare('INSERT INTO projects (user_id, name, description, status) VALUES (?, ?, ?, ?)')
    .run(userId, name, description ?? null, status ?? 'planning')

  return getProjectByIdForUser(Number(result.lastInsertRowid), userId)
}

export function updateProject(id, userId, fields) {
  const current = getProjectByIdForUser(id, userId)
  if (!current) {
    return null
  }

  const name = fields.name ?? current.name
  const description = fields.description !== undefined ? fields.description : current.description
  const status = fields.status ?? current.status

  getDb()
    .prepare(
      `UPDATE projects
       SET name = ?, description = ?, status = ?, updated_at = datetime('now')
       WHERE id = ? AND user_id = ?`,
    )
    .run(name, description, status, id, userId)

  return getProjectByIdForUser(id, userId)
}

export function deleteProject(id, userId) {
  const result = getDb().prepare('DELETE FROM projects WHERE id = ? AND user_id = ?').run(id, userId)
  return result.changes > 0
}
