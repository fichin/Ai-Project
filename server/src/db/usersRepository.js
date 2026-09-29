import { getPostgresPool, NOW_UTC_SQL } from './postgresClient.js'

export async function getUserByEmail(email) {
  const { rows } = await getPostgresPool().query('SELECT * FROM users WHERE email = $1', [email])
  return rows[0] ?? null
}

export async function getUserById(id) {
  const { rows } = await getPostgresPool().query('SELECT * FROM users WHERE id = $1', [id])
  return rows[0] ?? null
}

export async function createUser({ email, name, passwordHash }) {
  const pool = getPostgresPool()
  const { rows } = await pool.query(
    'INSERT INTO users (email, name, password_hash) VALUES ($1, $2, $3) RETURNING id',
    [email, name, passwordHash],
  )

  return getUserById(rows[0].id)
}

export async function updateUserPassword(userId, passwordHash) {
  await getPostgresPool().query(
    `UPDATE users SET password_hash = $1, updated_at = ${NOW_UTC_SQL} WHERE id = $2`,
    [passwordHash, userId],
  )
}

// Partial update: only the fields present in `fields` are changed, the rest
// keep their current value (same merge pattern as projectsRepository).
export async function updateUserProfile(userId, fields) {
  const current = await getUserById(userId)
  if (!current) {
    return null
  }

  const name = fields.name ?? current.name
  const avatarId = fields.avatarId !== undefined ? fields.avatarId : current.avatar_id

  await getPostgresPool().query(
    `UPDATE users SET name = $1, avatar_id = $2, updated_at = ${NOW_UTC_SQL} WHERE id = $3`,
    [name, avatarId, userId],
  )

  return getUserById(userId)
}

export async function markEmailVerified(userId) {
  await getPostgresPool().query(`UPDATE users SET email_verified_at = ${NOW_UTC_SQL} WHERE id = $1`, [userId])
}
