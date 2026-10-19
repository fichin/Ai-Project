import { Router } from 'express'
import {
  getUserByEmail,
  createUser,
  updateUserPassword,
  updateUserProfile,
  markEmailVerified,
} from '../db/usersRepository.js'
import { createSession, deleteSession, deleteSessionsForUser } from '../db/sessionsRepository.js'
import {
  createVerificationToken,
  consumeVerificationToken,
  deleteVerificationTokensForUser,
} from '../db/emailVerificationRepository.js'
import { createResetToken, consumeResetToken, deleteResetTokensForUser } from '../db/passwordResetRepository.js'
import { hashPassword, verifyPassword } from '../utils/passwordHash.js'
import { parseCookies } from '../utils/cookies.js'
import { requireAuth } from '../middleware/requireAuth.js'
import { loginLimiter, registerLimiter, forgotPasswordLimiter, resendVerificationLimiter } from '../middleware/rateLimiters.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { sendEmail } from '../services/mail/index.js'
import { verificationEmail, passwordResetEmail } from '../services/mail/templates.js'
import { AVATAR_IDS } from '../config/avatars.js'
import { logActivity } from '../db/activityRepository.js'
import { ACTIVITY_TYPES } from '../config/activity.js'
import { MAX_NAME_LENGTH } from '../config/limits.js'
import { env } from '../config/env.js'
import {
  SESSION_COOKIE_NAME,
  SESSION_TTL_DAYS,
  EMAIL_NOT_VERIFIED_CODE,
  EMAIL_NOT_VERIFIED_MESSAGE,
} from '../config/auth.js'

const router = Router()

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// In production the frontend and API are on different domains, so the
// browser only sends the session cookie back cross-site if it's
// `sameSite: 'none'` — which itself requires `secure: true`. Locally
// they share `localhost` over plain HTTP, where `secure` would drop the
// cookie entirely, so dev keeps the original `lax`/non-secure behavior.
const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: env.nodeEnv === 'production' ? 'none' : 'lax',
  secure: env.nodeEnv === 'production',
  maxAge: SESSION_TTL_DAYS * 24 * 60 * 60 * 1000,
  path: '/',
}

const GENERIC_VERIFICATION_MESSAGE = 'If an account with that email needs verification, a new link has been sent.'
const GENERIC_RESET_MESSAGE = 'If an account with that email exists, a password reset link has been sent.'

function toPublicUser(user) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    emailVerified: Boolean(user.email_verified_at),
    avatarId: user.avatar_id ?? null,
  }
}

function setSessionCookie(res, token) {
  res.cookie(SESSION_COOKIE_NAME, token, SESSION_COOKIE_OPTIONS)
}

function isValidEmail(email) {
  return typeof email === 'string' && EMAIL_REGEX.test(email.trim())
}

router.post(
  '/auth/register',
  registerLimiter,
  asyncHandler(async (req, res) => {
    const { email, password, name } = req.body ?? {}

    if (!isValidEmail(email)) {
      return res.status(400).json({ error: 'A valid "email" is required.' })
    }
    if (typeof password !== 'string' || password.length < 8) {
      return res.status(400).json({ error: '"password" must be at least 8 characters.' })
    }
    if (typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json({ error: 'A non-empty "name" is required.' })
    }
    if (name.trim().length > MAX_NAME_LENGTH) {
      return res.status(400).json({ error: `"name" must be at most ${MAX_NAME_LENGTH} characters.` })
    }

    const normalizedEmail = email.trim().toLowerCase()
    if (await getUserByEmail(normalizedEmail)) {
      return res.status(409).json({ error: 'An account with this email already exists.' })
    }

    const user = await createUser({
      email: normalizedEmail,
      name: name.trim(),
      passwordHash: hashPassword(password),
    })

    const verificationToken = await createVerificationToken(user.id)
    sendEmail(verificationEmail(user.email, verificationToken))

    // No session is created here: the account exists but can't be used to
    // access the app until the email is verified (see login below).
    res.status(201).json({
      requiresVerification: true,
      email: user.email,
      message: EMAIL_NOT_VERIFIED_MESSAGE,
    })
  }),
)

router.post(
  '/auth/login',
  loginLimiter,
  asyncHandler(async (req, res) => {
    const { email, password } = req.body ?? {}

    if (typeof email !== 'string' || typeof password !== 'string') {
      return res.status(400).json({ error: '"email" and "password" are required.' })
    }

    const user = await getUserByEmail(email.trim().toLowerCase())

    if (!user || !user.password_hash || !verifyPassword(password, user.password_hash)) {
      return res.status(401).json({ error: 'Invalid email or password.' })
    }

    if (!user.email_verified_at) {
      return res.status(403).json({
        error: EMAIL_NOT_VERIFIED_MESSAGE,
        code: EMAIL_NOT_VERIFIED_CODE,
        email: user.email,
      })
    }

    const token = await createSession(user.id)
    setSessionCookie(res, token)

    res.json({ user: toPublicUser(user) })
  }),
)

router.post(
  '/auth/logout',
  asyncHandler(async (req, res) => {
    const cookies = parseCookies(req.headers.cookie)
    await deleteSession(cookies[SESSION_COOKIE_NAME])
    res.clearCookie(SESSION_COOKIE_NAME, { path: '/' })
    res.status(204).end()
  }),
)

router.get(
  '/auth/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    res.json({ user: toPublicUser(req.user) })
  }),
)

// requireAuth resolves req.user from the session cookie, never from the
// request body — so this can only ever update the caller's own profile,
// regardless of what a client claims.
router.patch(
  '/auth/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { name, avatarId } = req.body ?? {}
    const fields = {}

    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim().length === 0) {
        return res.status(400).json({ error: '"name" must be a non-empty string.' })
      }
      if (name.trim().length > MAX_NAME_LENGTH) {
        return res.status(400).json({ error: `"name" must be at most ${MAX_NAME_LENGTH} characters.` })
      }
      fields.name = name.trim()
    }

    if (avatarId !== undefined) {
      if (avatarId !== null && !AVATAR_IDS.includes(avatarId)) {
        return res.status(400).json({ error: `"avatarId" must be null or one of: ${AVATAR_IDS.join(', ')}.` })
      }
      fields.avatarId = avatarId
    }

    if (Object.keys(fields).length === 0) {
      return res.status(400).json({ error: 'At least one editable field must be provided.' })
    }

    const updated = await updateUserProfile(req.user.id, fields)
    await logActivity(req.user.id, { type: ACTIVITY_TYPES.PROFILE_UPDATED })
    res.json({ user: toPublicUser(updated) })
  }),
)

router.post(
  '/auth/verify-email',
  asyncHandler(async (req, res) => {
    const { token } = req.body ?? {}

    if (typeof token !== 'string' || token.length === 0) {
      return res.status(400).json({ error: 'A verification token is required.' })
    }

    const userId = await consumeVerificationToken(token)
    if (!userId) {
      return res.status(400).json({ error: 'This verification link is invalid or has expired.' })
    }

    await markEmailVerified(userId)
    res.json({ message: 'Your email has been verified.' })
  }),
)

router.post(
  '/auth/resend-verification',
  resendVerificationLimiter,
  asyncHandler(async (req, res) => {
    const { email } = req.body ?? {}

    if (!isValidEmail(email)) {
      return res.status(400).json({ error: 'A valid "email" is required.' })
    }

    const user = await getUserByEmail(email.trim().toLowerCase())
    if (user && !user.email_verified_at) {
      await deleteVerificationTokensForUser(user.id)
      const token = await createVerificationToken(user.id)
      sendEmail(verificationEmail(user.email, token))
    }

    // Same response whether or not the account exists/needs verification, so
    // this endpoint can't be used to probe which emails are registered.
    res.json({ message: GENERIC_VERIFICATION_MESSAGE })
  }),
)

router.post(
  '/auth/forgot-password',
  forgotPasswordLimiter,
  asyncHandler(async (req, res) => {
    const { email } = req.body ?? {}

    if (!isValidEmail(email)) {
      return res.status(400).json({ error: 'A valid "email" is required.' })
    }

    const user = await getUserByEmail(email.trim().toLowerCase())
    if (user) {
      await deleteResetTokensForUser(user.id)
      const token = await createResetToken(user.id)
      sendEmail(passwordResetEmail(user.email, token))
    }

    res.json({ message: GENERIC_RESET_MESSAGE })
  }),
)

router.post(
  '/auth/reset-password',
  asyncHandler(async (req, res) => {
    const { token, password } = req.body ?? {}

    if (typeof token !== 'string' || token.length === 0) {
      return res.status(400).json({ error: 'A reset token is required.' })
    }
    if (typeof password !== 'string' || password.length < 8) {
      return res.status(400).json({ error: '"password" must be at least 8 characters.' })
    }

    const userId = await consumeResetToken(token)
    if (!userId) {
      return res.status(400).json({ error: 'This reset link is invalid or has expired.' })
    }

    await updateUserPassword(userId, hashPassword(password))
    await deleteResetTokensForUser(userId)
    await deleteSessionsForUser(userId)

    res.json({ message: 'Your password has been reset. Please log in with your new password.' })
  }),
)

export default router
