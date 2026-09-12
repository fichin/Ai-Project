import { getDb } from './index.js'
import { generateToken, hashToken } from '../utils/tokens.js'
import { EMAIL_VERIFICATION_TTL_HOURS } from '../config/auth.js'

export function createVerificationToken(userId) {
  const token = generateToken()
  const tokenHash = hashToken(token)

  getDb()
    .prepare(
      `INSERT INTO email_verification_tokens (id, user_id, expires_at)
       VALUES (?, ?, datetime('now', '+${EMAIL_VERIFICATION_TTL_HOURS} hours'))`,
    )
    .run(tokenHash, userId)

  return token
}

// Verification tokens are single-use: consuming a valid one deletes every
// outstanding token for that user (including itself), so a re-sent link
// invalidates any older ones too.
export function consumeVerificationToken(token) {
  const tokenHash = hashToken(token)
  const db = getDb()

  const row = db
    .prepare(`SELECT user_id FROM email_verification_tokens WHERE id = ? AND expires_at > datetime('now')`)
    .get(tokenHash)

  if (!row) {
    return null
  }

  db.prepare('DELETE FROM email_verification_tokens WHERE user_id = ?').run(row.user_id)
  return row.user_id
}

export function deleteVerificationTokensForUser(userId) {
  getDb().prepare('DELETE FROM email_verification_tokens WHERE user_id = ?').run(userId)
}
