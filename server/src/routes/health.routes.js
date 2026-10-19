import { Router } from 'express'
import { getPostgresPool } from '../db/postgresClient.js'

// Takes the pool-getter as a parameter so health.routes.test.js can inject
// a fake one and exercise the real route logic without touching Postgres
// or relying on module mocking — node:test's mock.module() is experimental
// and behaved inconsistently between the Node version used locally and
// the one CI runs, so dependency injection replaces it here instead.
export function createHealthRouter(getPool) {
  const router = Router()

  router.get('/health', (req, res) => {
    res.json({
      status: 'ok',
      message: 'API is running',
      timestamp: new Date().toISOString(),
    })
  })

  // Unlike /health above, this actually reaches Postgres — specifically so
  // an external scheduler (see .github/workflows/keepalive.yml) can ping it
  // to stop the free-tier Supabase project from auto-pausing after about a
  // week of inactivity, which /health alone can't do since it never touches
  // the database. SELECT 1 is the cheapest real round-trip: it confirms the
  // connection without reading or writing any table. This route is public
  // and unauthenticated, so the response never includes the actual error,
  // a stack trace, or anything from the connection string — only a plain
  // ok/error status. The real error is logged server-side for whoever's
  // watching deploy logs.
  router.get('/health/db', async (req, res) => {
    try {
      await getPool().query('SELECT 1')
      res.json({ status: 'ok' })
    } catch (error) {
      console.error('[health/db] database check failed:', error)
      res.status(503).json({ status: 'error' })
    }
  })

  return router
}

// app.js imports this default export directly and expects a ready-to-use
// router wired to the app's real database — the same factory tests use,
// just built with the real pool getter instead of a fake one.
export default createHealthRouter(getPostgresPool)
