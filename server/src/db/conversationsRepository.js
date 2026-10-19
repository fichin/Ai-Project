import { getPostgresPool, NOW_UTC_SQL } from './postgresClient.js'

// COUNT() is a bigint in Postgres, returned as a string by `pg` by
// default — cast to ::int so message_count stays a real number, same as
// SQLite.
export async function listConversationsByUser(userId) {
  const { rows } = await getPostgresPool().query(
    `SELECT c.*, COUNT(m.id)::int AS message_count
     FROM conversations c
     LEFT JOIN messages m ON m.conversation_id = c.id
     WHERE c.user_id = $1
     GROUP BY c.id
     ORDER BY c.updated_at DESC`,
    [userId],
  )
  return rows
}

// Used to enforce MAX_CONVERSATIONS_PER_USER (see config/env.js
// aiUsageCaps) before creating a new conversation.
export async function countConversationsByUser(userId) {
  const { rows } = await getPostgresPool().query('SELECT COUNT(*)::int AS count FROM conversations WHERE user_id = $1', [
    userId,
  ])
  return rows[0].count
}

export async function getConversationByIdForUser(id, userId) {
  const { rows } = await getPostgresPool().query('SELECT * FROM conversations WHERE id = $1 AND user_id = $2', [
    id,
    userId,
  ])
  return rows[0] ?? null
}

export async function createConversation(userId, title) {
  const pool = getPostgresPool()
  const { rows } = title
    ? await pool.query('INSERT INTO conversations (user_id, title) VALUES ($1, $2) RETURNING id', [userId, title])
    : await pool.query('INSERT INTO conversations (user_id) VALUES ($1) RETURNING id', [userId])

  return getConversationByIdForUser(rows[0].id, userId)
}

export async function deleteConversation(id, userId) {
  const result = await getPostgresPool().query('DELETE FROM conversations WHERE id = $1 AND user_id = $2', [
    id,
    userId,
  ])
  return result.rowCount > 0
}

export async function touchConversation(id) {
  await getPostgresPool().query(`UPDATE conversations SET updated_at = ${NOW_UTC_SQL} WHERE id = $1`, [id])
}

export async function setConversationTitle(id, title) {
  await getPostgresPool().query(`UPDATE conversations SET title = $1, updated_at = ${NOW_UTC_SQL} WHERE id = $2`, [
    title,
    id,
  ])
}
