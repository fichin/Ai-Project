import { getPostgresPool } from './postgresClient.js'

// COUNT() is a bigint, which `pg` returns as a string; ::int keeps it a number.
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

// `db` is the pool by default, or a transaction client from withTransaction.
export async function createConversation(userId, title, db = getPostgresPool()) {
  const { rows } = title
    ? await db.query('INSERT INTO conversations (user_id, title) VALUES ($1, $2) RETURNING *', [userId, title])
    : await db.query('INSERT INTO conversations (user_id) VALUES ($1) RETURNING *', [userId])
  return rows[0]
}

export async function deleteConversation(id, userId) {
  const result = await getPostgresPool().query('DELETE FROM conversations WHERE id = $1 AND user_id = $2', [
    id,
    userId,
  ])
  return result.rowCount > 0
}

export async function touchConversation(id, db = getPostgresPool()) {
  await db.query(`UPDATE conversations SET updated_at = now() WHERE id = $1`, [id])
}

export async function setConversationTitle(id, title, db = getPostgresPool()) {
  await db.query(`UPDATE conversations SET title = $1, updated_at = now() WHERE id = $2`, [title, id])
}
