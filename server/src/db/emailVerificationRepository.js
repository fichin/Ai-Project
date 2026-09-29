import { getPostgresPool, NOW_UTC_SQL } from './postgresClient.js'
import { generateToken, hashToken } from '../utils/tokens.js'
import { EMAIL_VERIFICATION_TTL_HOURS } from '../config/auth.js'

export async function createVerificationToken(userId) {
  const token = generateToken()
  const tokenHash = hashToken(token)

  await getPostgresPool().query(
    `INSERT INTO email_verification_tokens (id, user_id, expires_at)
     VALUES ($1, $2, to_char((NOW() + make_interval(hours => $3)) AT TIME ZONE 'utc', 'YYYY-MM-DD HH24:MI:SS'))`,
    [tokenHash, userId, EMAIL_VERIFICATION_TTL_HOURS],
  )

  return token
}

// Verification tokens are single-use. The check-and-delete of the token
// itself is one atomic statement (not a separate SELECT then DELETE) so two
// near-simultaneous requests for the same token can't both see it as valid
// before either deletes it. Any other outstanding tokens for the user (e.g.
// from a resend) are cleaned up separately afterward — not security
// critical the way the check on the token actually being used is, so a
// second statement is fine there.
export async function consumeVerificationToken(token) {
  const tokenHash = hashToken(token)
  const pool = getPostgresPool()

  const { rows } = await pool.query(
    `DELETE FROM email_verification_tokens WHERE id = $1 AND expires_at > ${NOW_UTC_SQL} RETURNING user_id`,
    [tokenHash],
  )

  if (rows.length === 0) {
    return null
  }

  const userId = rows[0].user_id
  await pool.query('DELETE FROM email_verification_tokens WHERE user_id = $1', [userId])
  return userId
}

export async function deleteVerificationTokensForUser(userId) {
  await getPostgresPool().query('DELETE FROM email_verification_tokens WHERE user_id = $1', [userId])
}
