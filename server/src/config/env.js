import 'dotenv/config'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const serverRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
const defaultDevOutboxDbPath = path.join(serverRoot, 'data', 'dev-outbox.db')

const nodeEnv = process.env.NODE_ENV || 'development'

function intEnv(name, fallback) {
  const raw = process.env[name]
  if (raw === undefined || raw === '') return fallback
  const parsed = Number(raw)
  return Number.isFinite(parsed) ? parsed : fallback
}

function minutes(n) {
  return n * 60 * 1000
}

export const env = {
  nodeEnv,
  port: process.env.PORT || 4000,
  // Render puts exactly one reverse proxy in front of this app, which
  // appends the real client IP as the LAST entry of X-Forwarded-For and
  // otherwise passes through whatever the client sent untouched. Express's
  // "trust proxy" set to this hop count makes `req.ip` resolve to that last
  // entry regardless of how many fake addresses an attacker prepends to the
  // front of the header — see rateLimiters.js, which relies on req.ip for
  // its per-IP limits. 0 locally: there's no proxy in front of a dev
  // server, so trust nothing from the header and use the raw socket address.
  trustProxyHops: intEnv('TRUST_PROXY_HOPS', nodeEnv === 'production' ? 1 : 0),
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  // Where the frontend is actually deployed — used to build the links sent
  // in verification/reset emails (see services/mail/templates.js). Kept
  // separate from corsOrigin: that one is a security boundary (which origin
  // the API accepts requests/cookies from), this one is just "where users
  // land when they click an email link" — the two happen to share a value
  // today but aren't the same concern.
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  anthropicApiKey: process.env.ANTHROPIC_API_KEY || '',
  anthropicModel: process.env.ANTHROPIC_MODEL || 'claude-sonnet-5',
  // Free-tier fallback AI provider (see services/ai/index.js) — only used
  // when ANTHROPIC_API_KEY isn't set, so a real key always takes priority.
  groqApiKey: process.env.GROQ_API_KEY || '',
  groqModel: process.env.GROQ_MODEL || 'openai/gpt-oss-20b',
  resendApiKey: process.env.RESEND_API_KEY || '',
  // Postgres/Supabase connection string — this is the app's real database
  // (see postgresClient.js and every db/*Repository.js file).
  databaseUrl: process.env.DATABASE_URL || '',
  // Local SQLite file for the dev-only email outbox ONLY (see
  // db/devOutboxDb.js) — not the app's database, which is Postgres above.
  devOutboxDbPath: process.env.DATABASE_PATH || defaultDevOutboxDbPath,
  // Per-route rate limits (see middleware/rateLimiters.js). All
  // env-configurable so limits can be tuned in production without a code
  // change; defaults match this app's actual traffic shape as a demo.
  rateLimits: {
    login: {
      windowMs: minutes(intEnv('LOGIN_RATE_LIMIT_WINDOW_MINUTES', 15)),
      max: intEnv('LOGIN_RATE_LIMIT_MAX', 10),
    },
    register: {
      windowMs: minutes(intEnv('REGISTER_RATE_LIMIT_WINDOW_MINUTES', 60)),
      max: intEnv('REGISTER_RATE_LIMIT_MAX', 5),
    },
    forgotPassword: {
      windowMs: minutes(intEnv('FORGOT_PASSWORD_RATE_LIMIT_WINDOW_MINUTES', 60)),
      max: intEnv('FORGOT_PASSWORD_RATE_LIMIT_MAX', 3),
    },
    resendVerification: {
      windowMs: minutes(intEnv('RESEND_VERIFICATION_RATE_LIMIT_WINDOW_MINUTES', 60)),
      max: intEnv('RESEND_VERIFICATION_RATE_LIMIT_MAX', 3),
    },
    chat: {
      windowMs: minutes(intEnv('CHAT_RATE_LIMIT_WINDOW_MINUTES', 1)),
      max: intEnv('CHAT_RATE_LIMIT_MAX', 20),
    },
  },
}
