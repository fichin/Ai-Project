import { getPostgresPool, NOW_UTC_SQL } from './postgresClient.js'
import { getProjectByIdForUser } from './projectsRepository.js'

export const ALLOWED_STATUSES = ['active', 'paused', 'draft']

export async function listAgentsByUser(userId) {
  const { rows } = await getPostgresPool().query(
    `SELECT a.*, p.name AS project_name
     FROM agents a
     LEFT JOIN projects p ON p.id = a.project_id
     WHERE a.user_id = $1
     ORDER BY a.updated_at DESC`,
    [userId],
  )
  return rows
}

export async function getAgentByIdForUser(id, userId) {
  const { rows } = await getPostgresPool().query(
    `SELECT a.*, p.name AS project_name
     FROM agents a
     LEFT JOIN projects p ON p.id = a.project_id
     WHERE a.id = $1 AND a.user_id = $2`,
    [id, userId],
  )
  return rows[0] ?? null
}

export async function projectExistsForUser(projectId, userId) {
  return Boolean(await getProjectByIdForUser(projectId, userId))
}

export async function createAgent(userId, { name, description, status, projectId }) {
  const pool = getPostgresPool()
  const { rows } = await pool.query(
    'INSERT INTO agents (user_id, project_id, name, description, status) VALUES ($1, $2, $3, $4, $5) RETURNING id',
    [userId, projectId ?? null, name, description ?? null, status ?? 'draft'],
  )

  return getAgentByIdForUser(rows[0].id, userId)
}

export async function updateAgent(id, userId, fields) {
  const current = await getAgentByIdForUser(id, userId)
  if (!current) {
    return null
  }

  const name = fields.name ?? current.name
  const description = fields.description !== undefined ? fields.description : current.description
  const status = fields.status ?? current.status
  const projectId = fields.projectId !== undefined ? fields.projectId : current.project_id

  await getPostgresPool().query(
    `UPDATE agents
     SET name = $1, description = $2, status = $3, project_id = $4, updated_at = ${NOW_UTC_SQL}
     WHERE id = $5 AND user_id = $6`,
    [name, description, status, projectId, id, userId],
  )

  return getAgentByIdForUser(id, userId)
}

export async function deleteAgent(id, userId) {
  const result = await getPostgresPool().query('DELETE FROM agents WHERE id = $1 AND user_id = $2', [id, userId])
  return result.rowCount > 0
}
