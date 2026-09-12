import { getDb } from './index.js'

export function listConversationsByUser(userId) {
  return getDb()
    .prepare(
      `SELECT c.*, COUNT(m.id) AS message_count
       FROM conversations c
       LEFT JOIN messages m ON m.conversation_id = c.id
       WHERE c.user_id = ?
       GROUP BY c.id
       ORDER BY c.updated_at DESC`,
    )
    .all(userId)
}

export function getConversationByIdForUser(id, userId) {
  return getDb().prepare('SELECT * FROM conversations WHERE id = ? AND user_id = ?').get(id, userId)
}

export function createConversation(userId, title) {
  const db = getDb()
  const result = title
    ? db.prepare('INSERT INTO conversations (user_id, title) VALUES (?, ?)').run(userId, title)
    : db.prepare('INSERT INTO conversations (user_id) VALUES (?)').run(userId)

  return getConversationByIdForUser(Number(result.lastInsertRowid), userId)
}

export function deleteConversation(id, userId) {
  const result = getDb().prepare('DELETE FROM conversations WHERE id = ? AND user_id = ?').run(id, userId)
  return result.changes > 0
}

export function touchConversation(id) {
  getDb().prepare("UPDATE conversations SET updated_at = datetime('now') WHERE id = ?").run(id)
}

export function setConversationTitle(id, title) {
  getDb()
    .prepare("UPDATE conversations SET title = ?, updated_at = datetime('now') WHERE id = ?")
    .run(title, id)
}
