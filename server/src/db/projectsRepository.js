import { getPostgresPool, NOW_UTC_SQL } from './postgresClient.js'

export const ALLOWED_STATUSES = ['active', 'planning', 'completed', 'archived']

// COUNT(...) is a bigint in Postgres, which `pg` returns as a string by
// default (to avoid precision loss beyond Number.MAX_SAFE_INTEGER) — cast
// to ::int here so agent_count comes back as a real number, matching what
// SQLite always returned.
export async function listProjectsByUser(userId) {
  const { rows } = await getPostgresPool().query(
    `SELECT p.*, COUNT(a.id)::int AS agent_count
     FROM projects p
     LEFT JOIN agents a ON a.project_id = p.id
     WHERE p.user_id = $1
     GROUP BY p.id
     ORDER BY p.updated_at DESC`,
    [userId],
  )
  return rows
}

export async function getProjectByIdForUser(id, userId) {
  const { rows } = await getPostgresPool().query(
    `SELECT p.*, COUNT(a.id)::int AS agent_count
     FROM projects p
     LEFT JOIN agents a ON a.project_id = p.id
     WHERE p.id = $1 AND p.user_id = $2
     GROUP BY p.id`,
    [id, userId],
  )
  return rows[0] ?? null
}

export async function createProject(userId, { name, description, status }) {
  const pool = getPostgresPool()
  const { rows } = await pool.query(
    'INSERT INTO projects (user_id, name, description, status) VALUES ($1, $2, $3, $4) RETURNING id',
    [userId, name, description ?? null, status ?? 'planning'],
  )

  return getProjectByIdForUser(rows[0].id, userId)
}

export async function updateProject(id, userId, fields) {
  const current = await getProjectByIdForUser(id, userId)
  if (!current) {
    return null
  }

  const name = fields.name ?? current.name
  const description = fields.description !== undefined ? fields.description : current.description
  const status = fields.status ?? current.status

  await getPostgresPool().query(
    `UPDATE projects
     SET name = $1, description = $2, status = $3, updated_at = ${NOW_UTC_SQL}
     WHERE id = $4 AND user_id = $5`,
    [name, description, status, id, userId],
  )

  return getProjectByIdForUser(id, userId)
}

export async function deleteProject(id, userId) {
  const result = await getPostgresPool().query('DELETE FROM projects WHERE id = $1 AND user_id = $2', [id, userId])
  return result.rowCount > 0
}
