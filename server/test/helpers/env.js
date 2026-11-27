// Must run before anything imports src/config/env.js, so test/helpers/app.js
// imports it first. dotenv never overrides a variable that is already set,
// even to '', so whatever server/.env holds (real AI keys, a real
// DATABASE_URL) cannot reach the tests.
import { tmpdir } from 'node:os'
import path from 'node:path'
import { randomBytes } from 'node:crypto'

const forced = {
  NODE_ENV: 'test',
  RENDER: '',
  // The helpers hand the app its pool directly; nothing may fall back to this.
  DATABASE_URL: '',
  // No keys: the app picks the mock AI provider and the console mail provider.
  ANTHROPIC_API_KEY: '',
  GROQ_API_KEY: '',
  RESEND_API_KEY: '',
  // Each test process gets its own outbox file, so parallel files can't collide.
  DATABASE_PATH: path.join(tmpdir(), `ai-project-outbox-${process.pid}-${randomBytes(4).toString('hex')}.db`),
}

// Rate limits are tested on their own (rateLimiters.test.js); here they would
// only make tests depend on how many requests earlier tests sent.
const RATE_LIMITS = ['LOGIN', 'LOGIN_PER_EMAIL', 'REGISTER', 'FORGOT_PASSWORD', 'FORGOT_PASSWORD_PER_EMAIL',
  'RESEND_VERIFICATION', 'RESEND_VERIFICATION_PER_EMAIL', 'CHAT']
for (const name of RATE_LIMITS) forced[`${name}_RATE_LIMIT_MAX`] = '100000'

Object.assign(process.env, forced)

export const OUTBOX_PATH = forced.DATABASE_PATH
