import { getPostgresPool, NOW_UTC_SQL } from './postgresClient.js'
import { generateToken, hashToken } from '../utils/tokens.js'
import { PASSWORD_RESET_TTL_MINUTES } from '../config/auth.js'

export async function createResetToken(userId) {
  const token = generateToken()
  const tokenHash = hashToken(token)

  await getPostgresPool().query(
    `INSERT INTO password_reset_tokens (id, user_id, expires_at)
     VALUES ($1, $2, to_char((NOW() + make_interval(mins => $3)) AT TIME ZONE 'utc', 'YYYY-MM-DD HH24:MI:SS'))`,
    [tokenHash, userId, PASSWORD_RESET_TTL_MINUTES],
  )

  return token
}

// Single-use, same as consumeVerificationToken: checking validity and
// deleting the token is one atomic statement, closing the race window
// where two near-simultaneous requests could both see it as still valid.
export async function consumeResetToken(token) {
  const tokenHash = hashToken(token)
  const { rows } = await getPostgresPool().query(
    `DELETE FROM password_reset_tokens WHERE id = $1 AND expires_at > ${NOW_UTC_SQL} RETURNING user_id`,
    [tokenHash],
  )
  return rows[0]?.user_id ?? null
}

// Single-use: deleting every token for the user (not just the one used)
// means an older, still-outstanding reset link can't be used after a newer
// one already succeeded.
export async function deleteResetTokensForUser(userId) {
  await getPostgresPool().query('DELETE FROM password_reset_tokens WHERE user_id = $1', [userId])
}
