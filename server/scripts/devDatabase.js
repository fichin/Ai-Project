// A real Postgres for local development, with no Docker or install: PGlite
// (Postgres compiled to WebAssembly) kept on disk and served over TCP, so the
// app connects with the normal pg driver exactly as it does to Supabase.
//
//   npm run db:dev   then put the printed lines in server/.env
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { PGlite } from '@electric-sql/pglite'
import { PGLiteSocketServer } from '@electric-sql/pglite-socket'
import { loadMigrations, migrate } from '../src/db/migrator.js'

const serverRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
export const DEFAULT_DATA_DIR = path.join(serverRoot, 'data', 'dev-db')
// 5433, not 5432: leaves the standard port free for a real Postgres later.
export const DEFAULT_PORT = 5433
const HOST = '127.0.0.1'

export async function startDevDatabase({ dataDir = DEFAULT_DATA_DIR, port = DEFAULT_PORT } = {}) {
  const db = new PGlite(dataDir)
  // Migrations run on every start, so a pull with a new migration just works.
  const { applied } = await migrate(db, await loadMigrations())

  // Bound to 127.0.0.1 only: nothing else on the network can reach it.
  const server = new PGLiteSocketServer({ db, port, host: HOST })
  try {
    await server.start()
  } catch (error) {
    await db.close()
    throw error
  }

  return {
    applied,
    databaseUrl: `postgres://postgres@${HOST}:${port}/postgres`,
    async stop() {
      await server.stop()
      // close() flushes to disk; killing the process without it can lose writes.
      await db.close()
    },
  }
}

async function main() {
  const port = Number(process.env.DEV_DB_PORT) || DEFAULT_PORT
  const dataDir = process.env.DEV_DB_DIR || DEFAULT_DATA_DIR
  const dev = await startDevDatabase({ dataDir, port })

  console.log(`Dev database (PGlite) in ${dataDir}`)
  console.log(dev.applied.length ? `Applied: ${dev.applied.join(', ')}` : 'Migrations: up to date')
  console.log('\nPut these in server/.env, then run "npm run dev" in another terminal:\n')
  console.log(`DATABASE_URL=${dev.databaseUrl}`)
  // The socket server shares one Postgres session between all connections.
  console.log('DATABASE_POOL_MAX=1')
  console.log('\nCtrl+C to stop.')

  let stopping = false
  const shutdown = async () => {
    if (stopping) return
    stopping = true
    await dev.stop()
    process.exit(0)
  }
  process.on('SIGINT', shutdown)
  process.on('SIGTERM', shutdown)
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error.code === 'EADDRINUSE' ? `Port in use. Set DEV_DB_PORT to another port.` : error)
    process.exit(1)
  })
}
