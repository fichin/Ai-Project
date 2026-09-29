import { getPostgresPool } from './postgresClient.js'

export async function listMessagesByConversation(conversationId) {
  const { rows } = await getPostgresPool().query(
    'SELECT * FROM messages WHERE conversation_id = $1 ORDER BY created_at ASC, id ASC',
    [conversationId],
  )
  return rows
}

// COUNT(*) is a bigint in Postgres, returned as a string by `pg` by
// default. This one matters more than a display quirk: chatService.js does
// `countMessages(id) === 0` to detect the first message in a conversation —
// a strict `===` against the string "0" would always be false, silently
// breaking the auto-title-on-first-message behavior. ::int keeps this a
// real number, same as SQLite.
export async function countMessages(conversationId) {
  const { rows } = await getPostgresPool().query(
    'SELECT COUNT(*)::int AS count FROM messages WHERE conversation_id = $1',
    [conversationId],
  )
  return rows[0].count
}

export async function createMessage(conversationId, role, content) {
  const pool = getPostgresPool()
  const { rows } = await pool.query(
    'INSERT INTO messages (conversation_id, role, content) VALUES ($1, $2, $3) RETURNING id',
    [conversationId, role, content],
  )

  const { rows: messageRows } = await pool.query('SELECT * FROM messages WHERE id = $1', [rows[0].id])
  return messageRows[0]
}
