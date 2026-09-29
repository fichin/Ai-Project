import { randomBytes, createHash } from 'node:crypto'
import { getPostgresPool, NOW_UTC_SQL } from './postgresClient.js'
import { SESSION_TTL_DAYS } from '../config/auth.js'

function hashToken(token) {
  return createHash('sha256').update(token).digest('hex')
}

// The raw token goes in the cookie; only its hash is stored, so reading the
// sessions table alone never yields a usable session.
export async function createSession(userId) {
  const token = randomBytes(32).toString('hex')
  const tokenHash = hashToken(token)

  await getPostgresPool().query(
    `INSERT INTO sessions (id, user_id, expires_at)
     VALUES ($1, $2, to_char((NOW() + make_interval(days => $3)) AT TIME ZONE 'utc', 'YYYY-MM-DD HH24:MI:SS'))`,
    [tokenHash, userId, SESSION_TTL_DAYS],
  )

  return token
}

export async function getSessionUser(token) {
  if (!token) {
    return null
  }

  const tokenHash = hashToken(token)
  const { rows } = await getPostgresPool().query(
    `SELECT u.id, u.email, u.name, u.email_verified_at, u.avatar_id
     FROM sessions s
     JOIN users u ON u.id = s.user_id
     WHERE s.id = $1 AND s.expires_at > ${NOW_UTC_SQL}`,
    [tokenHash],
  )
  return rows[0] ?? null
}

export async function deleteSession(token) {
  if (!token) {
    return
  }

  await getPostgresPool().query('DELETE FROM sessions WHERE id = $1', [hashToken(token)])
}

// Used after a password reset so any other logged-in sessions are forced to
// log in again with the new password.
export async function deleteSessionsForUser(userId) {
  await getPostgresPool().query('DELETE FROM sessions WHERE user_id = $1', [userId])
}
