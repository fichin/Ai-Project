import { getPostgresPool } from './postgresClient.js'

// Called only after the primary write it describes has already succeeded —
// see each call site in projects/agents/auth routes. A failed operation must
// never reach this function.
export async function logActivity(userId, { type, entityType = null, entityId = null, entityName = null }) {
  await getPostgresPool().query(
    `INSERT INTO activity_events (user_id, type, entity_type, entity_id, entity_name)
     VALUES ($1, $2, $3, $4, $5)`,
    [userId, type, entityType, entityId, entityName],
  )
}

export async function listActivityForUser(userId, limit = 50) {
  const { rows } = await getPostgresPool().query(
    'SELECT * FROM activity_events WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2',
    [userId, limit],
  )
  return rows
}
