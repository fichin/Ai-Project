import { getDb } from './index.js'
import { generateToken, hashToken } from '../utils/tokens.js'
import { PASSWORD_RESET_TTL_MINUTES } from '../config/auth.js'

export function createResetToken(userId) {
  const token = generateToken()
  const tokenHash = hashToken(token)

  getDb()
    .prepare(
      `INSERT INTO password_reset_tokens (id, user_id, expires_at)
       VALUES (?, ?, datetime('now', '+${PASSWORD_RESET_TTL_MINUTES} minutes'))`,
    )
    .run(tokenHash, userId)

  return token
}

export function getValidResetToken(token) {
  const tokenHash = hashToken(token)
  return getDb()
    .prepare(`SELECT * FROM password_reset_tokens WHERE id = ? AND expires_at > datetime('now')`)
    .get(tokenHash)
}

// Single-use: deleting every token for the user (not just the one used)
// means an older, still-outstanding reset link can't be used after a newer
// one already succeeded.
export function deleteResetTokensForUser(userId) {
  getDb().prepare('DELETE FROM password_reset_tokens WHERE user_id = ?').run(userId)
}
