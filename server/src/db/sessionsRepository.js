import { randomBytes, createHash } from 'node:crypto'
import { getDb } from './index.js'
import { SESSION_TTL_DAYS } from '../config/auth.js'

function hashToken(token) {
  return createHash('sha256').update(token).digest('hex')
}

// The raw token goes in the cookie; only its hash is stored, so reading the
// sessions table alone never yields a usable session.
export function createSession(userId) {
  const token = randomBytes(32).toString('hex')
  const tokenHash = hashToken(token)

  getDb()
    .prepare(`INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, datetime('now', '+${SESSION_TTL_DAYS} days'))`)
    .run(tokenHash, userId)

  return token
}

export function getSessionUser(token) {
  if (!token) {
    return null
  }

  const tokenHash = hashToken(token)
  return getDb()
    .prepare(
      `SELECT u.id, u.email, u.name, u.email_verified_at, u.avatar_id
       FROM sessions s
       JOIN users u ON u.id = s.user_id
       WHERE s.id = ? AND s.expires_at > datetime('now')`,
    )
    .get(tokenHash)
}

export function deleteSession(token) {
  if (!token) {
    return
  }

  getDb().prepare('DELETE FROM sessions WHERE id = ?').run(hashToken(token))
}

// Used after a password reset so any other logged-in sessions are forced to
// log in again with the new password.
export function deleteSessionsForUser(userId) {
  getDb().prepare('DELETE FROM sessions WHERE user_id = ?').run(userId)
}
