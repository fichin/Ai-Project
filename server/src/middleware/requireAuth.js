import { parseCookies } from '../utils/cookies.js'
import { getSessionUser } from '../db/sessionsRepository.js'
import { SESSION_COOKIE_NAME, EMAIL_NOT_VERIFIED_CODE, EMAIL_NOT_VERIFIED_MESSAGE } from '../config/auth.js'

export function requireAuth(req, res, next) {
  const cookies = parseCookies(req.headers.cookie)
  const user = getSessionUser(cookies[SESSION_COOKIE_NAME])

  if (!user) {
    return res.status(401).json({ error: 'Authentication required.' })
  }

  // Defense in depth: login/register no longer issue a session for an
  // unverified account, but this still guards any session that might exist
  // from before that rule (e.g. one created before this change shipped).
  if (!user.email_verified_at) {
    return res.status(403).json({
      error: EMAIL_NOT_VERIFIED_MESSAGE,
      code: EMAIL_NOT_VERIFIED_CODE,
      email: user.email,
    })
  }

  req.user = user
  next()
}
