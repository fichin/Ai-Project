import 'dotenv/config'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const serverRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
const defaultDevOutboxDbPath = path.join(serverRoot, 'data', 'dev-outbox.db')

export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: process.env.PORT || 4000,
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  anthropicApiKey: process.env.ANTHROPIC_API_KEY || '',
  anthropicModel: process.env.ANTHROPIC_MODEL || 'claude-sonnet-5',
  resendApiKey: process.env.RESEND_API_KEY || '',
  // Postgres/Supabase connection string — this is the app's real database
  // (see postgresClient.js and every db/*Repository.js file).
  databaseUrl: process.env.DATABASE_URL || '',
  // Local SQLite file for the dev-only email outbox ONLY (see
  // db/devOutboxDb.js) — not the app's database, which is Postgres above.
  devOutboxDbPath: process.env.DATABASE_PATH || defaultDevOutboxDbPath,
}
