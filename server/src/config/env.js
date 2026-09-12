import 'dotenv/config'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const serverRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
const defaultDbPath = path.join(serverRoot, 'data', 'app.db')

export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: process.env.PORT || 4000,
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  anthropicApiKey: process.env.ANTHROPIC_API_KEY || '',
  anthropicModel: process.env.ANTHROPIC_MODEL || 'claude-sonnet-5',
  dbPath: process.env.DATABASE_PATH || defaultDbPath,
}
