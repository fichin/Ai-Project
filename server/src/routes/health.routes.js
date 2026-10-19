import { Router } from 'express'
import { getPostgresPool } from '../db/postgresClient.js'

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
    await getPostgresPool().query('SELECT 1')
    res.json({ status: 'ok' })
  } catch (error) {
    console.error('[health/db] database check failed:', error)
    res.status(503).json({ status: 'error' })
  }
})

export default router
