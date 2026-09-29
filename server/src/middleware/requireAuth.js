import { parseCookies } from '../utils/cookies.js'
import { getSessionUser } from '../db/sessionsRepository.js'
import { SESSION_COOKIE_NAME, EMAIL_NOT_VERIFIED_CODE, EMAIL_NOT_VERIFIED_MESSAGE } from '../config/auth.js'
import { asyncHandler } from '../utils/asyncHandler.js'

async function checkAuth(req, res, next) {
  const cookies = parseCookies(req.headers.cookie)
  const user = await getSessionUser(cookies[SESSION_COOKIE_NAME])

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

// Wrapped here rather than at each call site — app.js mounts this on 8
// separate protected routers, and this file's own /auth/me routes use it
// too — so every consumer gets rejection-safe behavior with no changes
// needed anywhere else.
export const requireAuth = asyncHandler(checkAuth)
