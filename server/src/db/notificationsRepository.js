import { getPostgresPool, NOW_UTC_SQL } from './postgresClient.js'

// Called only after the primary write it describes has already succeeded —
// see each call site in projects/agents routes. A failed operation must
// never reach this function.
export async function createNotification(userId, { type, entityType = null, entityId = null, entityName = null }) {
  await getPostgresPool().query(
    `INSERT INTO notifications (user_id, type, entity_type, entity_id, entity_name)
     VALUES ($1, $2, $3, $4, $5)`,
    [userId, type, entityType, entityId, entityName],
  )
}

export async function listNotificationsForUser(userId, limit = 50) {
  const { rows } = await getPostgresPool().query(
    'SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2',
    [userId, limit],
  )
  return rows
}

// COUNT(*) is a bigint in Postgres, returned as a string by `pg` by
// default — cast to ::int so this stays a real number, same as SQLite.
export async function getUnreadCountForUser(userId) {
  const { rows } = await getPostgresPool().query(
    'SELECT COUNT(*)::int AS count FROM notifications WHERE user_id = $1 AND read_at IS NULL',
    [userId],
  )
  return rows[0].count
}

// Ownership is enforced by the `user_id = $2` clause in the initial lookup,
// not just by the caller checking req.user.id — a request for another
// user's notification id simply finds no row.
export async function markNotificationRead(id, userId) {
  const pool = getPostgresPool()
  const { rows: existingRows } = await pool.query('SELECT * FROM notifications WHERE id = $1 AND user_id = $2', [
    id,
    userId,
  ])
  const existing = existingRows[0]
  if (!existing) return null
  if (existing.read_at) return existing

  await pool.query(`UPDATE notifications SET read_at = ${NOW_UTC_SQL} WHERE id = $1`, [id])
  const { rows } = await pool.query('SELECT * FROM notifications WHERE id = $1', [id])
  return rows[0]
}

export async function markAllNotificationsRead(userId) {
  await getPostgresPool().query(
    `UPDATE notifications SET read_at = ${NOW_UTC_SQL} WHERE user_id = $1 AND read_at IS NULL`,
    [userId],
  )
}
