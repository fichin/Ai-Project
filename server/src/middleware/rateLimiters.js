import rateLimit from 'express-rate-limit'
import { env } from '../config/env.js'

// Every limiter returns the same JSON error shape the rest of the API uses
// (see errorHandler.js), so the frontend can treat a 429 like any other
// error response instead of needing special-case handling.
function jsonRateLimitHandler(message) {
  return (req, res) => {
    res.status(429).json({ error: message })
  }
}

const sharedOptions = {
  standardHeaders: true,
  legacyHeaders: false,
}

// Normalizes the same way register/login already do (trim + lowercase) so
// the same account always maps to the same bucket. Returns null when there
// is no usable email to key on, which every per-email limiter below treats
// as "skip me" — falling back to whatever IP-based limiter is mounted
// alongside it, rather than crashing or applying a limit keyed on
// something meaningless like the literal string "undefined".
function normalizedEmailOrNull(req) {
  const email = req.body?.email
  return typeof email === 'string' && email.trim().length > 0 ? email.trim().toLowerCase() : null
}

// Keyed by req.ip (the default), which is only trustworthy because
// app.js sets "trust proxy" to env.trustProxyHops — see that file and
// config/env.js for why a spoofed X-Forwarded-For can't move a request
// into a different bucket.
export const loginLimiter = rateLimit({
  ...sharedOptions,
  windowMs: env.rateLimits.login.windowMs,
  max: env.rateLimits.login.max,
  handler: jsonRateLimitHandler('Too many login attempts. Please wait a while before trying again.'),
})

// Backstop for the IP-based loginLimiter above: behind the Vercel ->
// Render proxy chain, req.ip has been observed resolving inconsistently
// (see the now-removed debugClientIp investigation), which can let a
// distributed/spoofed attack dodge the IP bucket. This counts failed
// attempts against the targeted *account* instead, which no amount of IP
// or X-Forwarded-For manipulation can move into a different bucket —
// only knowing a different email can. skipSuccessfulRequests means a
// correct password never counts against the account's own limit, only
// wrong ones (matching what "10 failed attempts" should mean). Skipped
// entirely (falls back to loginLimiter alone) when the request has no
// usable email to key on.
export const loginPerEmailLimiter = rateLimit({
  ...sharedOptions,
  windowMs: env.rateLimits.loginPerEmail.windowMs,
  max: env.rateLimits.loginPerEmail.max,
  skipSuccessfulRequests: true,
  skip: (req) => normalizedEmailOrNull(req) === null,
  keyGenerator: (req) => normalizedEmailOrNull(req),
  handler: jsonRateLimitHandler('Too many failed login attempts for this account. Please wait a while before trying again.'),
})

export const registerLimiter = rateLimit({
  ...sharedOptions,
  windowMs: env.rateLimits.register.windowMs,
  max: env.rateLimits.register.max,
  handler: jsonRateLimitHandler('Too many accounts created from this address. Please try again later.'),
})

export const forgotPasswordLimiter = rateLimit({
  ...sharedOptions,
  windowMs: env.rateLimits.forgotPassword.windowMs,
  max: env.rateLimits.forgotPassword.max,
  handler: jsonRateLimitHandler('Too many password reset requests. Please try again later.'),
})

export const resendVerificationLimiter = rateLimit({
  ...sharedOptions,
  windowMs: env.rateLimits.resendVerification.windowMs,
  max: env.rateLimits.resendVerification.max,
  handler: jsonRateLimitHandler('Too many verification emails requested. Please try again later.'),
})

// Chat abuse is a per-account cost problem, not a per-IP one (a logged-in
// user behind a shared/corporate IP shouldn't be throttled by someone
// else's usage, and a script using many accounts from one IP is already
// bounded by the login/register limiters above) — so this is keyed by the
// authenticated user's id instead of req.ip. Only mounted after
// requireAuth (see chat.routes.js), so req.user is always set here.
export const chatLimiter = rateLimit({
  ...sharedOptions,
  windowMs: env.rateLimits.chat.windowMs,
  max: env.rateLimits.chat.max,
  keyGenerator: (req) => String(req.user.id),
  handler: jsonRateLimitHandler('Too many messages sent. Please slow down and try again shortly.'),
})
