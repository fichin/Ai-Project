import { Router } from 'express'
import { getDb } from '../db/index.js'

const router = Router()

// Only mounted outside production (see app.js) — lets local testing read
// back "sent" verification/reset emails without a real mail provider.
router.get('/dev/outbox', (req, res) => {
  const { to } = req.query

  const rows =
    typeof to === 'string' && to.length > 0
      ? getDb()
          .prepare('SELECT * FROM dev_outbox_emails WHERE to_email = ? ORDER BY created_at DESC LIMIT 20')
          .all(to.trim().toLowerCase())
      : getDb().prepare('SELECT * FROM dev_outbox_emails ORDER BY created_at DESC LIMIT 20').all()

  res.json(rows)
})

export default router
