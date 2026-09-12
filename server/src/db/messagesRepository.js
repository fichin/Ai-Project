import { getDb } from './index.js'

export function listMessagesByConversation(conversationId) {
  return getDb()
    .prepare('SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC, id ASC')
    .all(conversationId)
}

export function countMessages(conversationId) {
  const row = getDb()
    .prepare('SELECT COUNT(*) AS count FROM messages WHERE conversation_id = ?')
    .get(conversationId)
  return row.count
}

export function createMessage(conversationId, role, content) {
  const db = getDb()
  const result = db
    .prepare('INSERT INTO messages (conversation_id, role, content) VALUES (?, ?, ?)')
    .run(conversationId, role, content)

  return db.prepare('SELECT * FROM messages WHERE id = ?').get(Number(result.lastInsertRowid))
}
