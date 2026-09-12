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
import { createResetToken, getValidResetToken, deleteResetTokensForUser } from '../db/passwordResetRepository.js'
import { hashPassword, verifyPassword } from '../utils/passwordHash.js'
import { parseCookies } from '../utils/cookies.js'
import { requireAuth } from '../middleware/requireAuth.js'
import { sendEmail } from '../services/mail/index.js'
import { verificationEmail, passwordResetEmail } from '../services/mail/templates.js'
import { AVATAR_IDS } from '../config/avatars.js'
import {
  SESSION_COOKIE_NAME,
  SESSION_TTL_DAYS,
  EMAIL_NOT_VERIFIED_CODE,
  EMAIL_NOT_VERIFIED_MESSAGE,
} from '../config/auth.js'

const router = Router()

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: 'lax',
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

router.post('/auth/register', (req, res) => {
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

  const normalizedEmail = email.trim().toLowerCase()
  if (getUserByEmail(normalizedEmail)) {
    return res.status(409).json({ error: 'An account with this email already exists.' })
  }

  const user = createUser({
    email: normalizedEmail,
    name: name.trim(),
    passwordHash: hashPassword(password),
  })

  const verificationToken = createVerificationToken(user.id)
  sendEmail(verificationEmail(user.email, verificationToken))

  // No session is created here: the account exists but can't be used to
  // access the app until the email is verified (see login below).
  res.status(201).json({
    requiresVerification: true,
    email: user.email,
    message: EMAIL_NOT_VERIFIED_MESSAGE,
  })
})

router.post('/auth/login', (req, res) => {
  const { email, password } = req.body ?? {}

  if (typeof email !== 'string' || typeof password !== 'string') {
    return res.status(400).json({ error: '"email" and "password" are required.' })
  }

  const user = getUserByEmail(email.trim().toLowerCase())

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

  const token = createSession(user.id)
  setSessionCookie(res, token)

  res.json({ user: toPublicUser(user) })
})

router.post('/auth/logout', (req, res) => {
  const cookies = parseCookies(req.headers.cookie)
  deleteSession(cookies[SESSION_COOKIE_NAME])
  res.clearCookie(SESSION_COOKIE_NAME, { path: '/' })
  res.status(204).end()
})

router.get('/auth/me', requireAuth, (req, res) => {
  res.json({ user: toPublicUser(req.user) })
})

// requireAuth resolves req.user from the session cookie, never from the
// request body — so this can only ever update the caller's own profile,
// regardless of what a client claims.
router.patch('/auth/me', requireAuth, (req, res) => {
  const { name, avatarId } = req.body ?? {}
  const fields = {}

  if (name !== undefined) {
    if (typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json({ error: '"name" must be a non-empty string.' })
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

  const updated = updateUserProfile(req.user.id, fields)
  res.json({ user: toPublicUser(updated) })
})

router.post('/auth/verify-email', (req, res) => {
  const { token } = req.body ?? {}

  if (typeof token !== 'string' || token.length === 0) {
    return res.status(400).json({ error: 'A verification token is required.' })
  }

  const userId = consumeVerificationToken(token)
  if (!userId) {
    return res.status(400).json({ error: 'This verification link is invalid or has expired.' })
  }

  markEmailVerified(userId)
  res.json({ message: 'Your email has been verified.' })
})

router.post('/auth/resend-verification', (req, res) => {
  const { email } = req.body ?? {}

  if (!isValidEmail(email)) {
    return res.status(400).json({ error: 'A valid "email" is required.' })
  }

  const user = getUserByEmail(email.trim().toLowerCase())
  if (user && !user.email_verified_at) {
    deleteVerificationTokensForUser(user.id)
    const token = createVerificationToken(user.id)
    sendEmail(verificationEmail(user.email, token))
  }

  // Same response whether or not the account exists/needs verification, so
  // this endpoint can't be used to probe which emails are registered.
  res.json({ message: GENERIC_VERIFICATION_MESSAGE })
})

router.post('/auth/forgot-password', (req, res) => {
  const { email } = req.body ?? {}

  if (!isValidEmail(email)) {
    return res.status(400).json({ error: 'A valid "email" is required.' })
  }

  const user = getUserByEmail(email.trim().toLowerCase())
  if (user) {
    deleteResetTokensForUser(user.id)
    const token = createResetToken(user.id)
    sendEmail(passwordResetEmail(user.email, token))
  }

  res.json({ message: GENERIC_RESET_MESSAGE })
})

router.post('/auth/reset-password', (req, res) => {
  const { token, password } = req.body ?? {}

  if (typeof token !== 'string' || token.length === 0) {
    return res.status(400).json({ error: 'A reset token is required.' })
  }
  if (typeof password !== 'string' || password.length < 8) {
    return res.status(400).json({ error: '"password" must be at least 8 characters.' })
  }

  const resetRow = getValidResetToken(token)
  if (!resetRow) {
    return res.status(400).json({ error: 'This reset link is invalid or has expired.' })
  }

  updateUserPassword(resetRow.user_id, hashPassword(password))
  deleteResetTokensForUser(resetRow.user_id)
  deleteSessionsForUser(resetRow.user_id)

  res.json({ message: 'Your password has been reset. Please log in with your new password.' })
})

export default router
