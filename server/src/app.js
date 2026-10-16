import express from 'express'
import cors from 'cors'
import { env } from './config/env.js'
import healthRoutes from './routes/health.routes.js'
import authRoutes from './routes/auth.routes.js'
import chatRoutes from './routes/chat.routes.js'
import projectsRoutes from './routes/projects.routes.js'
import agentsRoutes from './routes/agents.routes.js'
import conversationsRoutes from './routes/conversations.routes.js'
import dashboardRoutes from './routes/dashboard.routes.js'
import activityRoutes from './routes/activity.routes.js'
import notificationsRoutes from './routes/notifications.routes.js'
import preferencesRoutes from './routes/preferences.routes.js'
import devRoutes from './routes/dev.routes.js'
import { notFound } from './middleware/notFound.js'
import { errorHandler } from './middleware/errorHandler.js'
import { requireAuth } from './middleware/requireAuth.js'

export function createApp() {
  const app = express()

  // See config/env.js: Render puts exactly one proxy in front of this app,
  // which appends the real client IP as the LAST X-Forwarded-For entry.
  // This hop count makes req.ip resolve to that entry regardless of what
  // an attacker prepends to the front of the header.
  app.set('trust proxy', env.trustProxyHops)

  app.use(cors({ origin: env.corsOrigin, credentials: true }))
  // 20kb comfortably covers every real request body this API accepts (the
  // largest being a chat message, capped at 2000 characters — see
  // config/limits.js) while still rejecting an oversized payload before it
  // reaches any route handler.
  app.use(express.json({ limit: '20kb' }))

  app.use('/api', healthRoutes)
  app.use('/api', authRoutes)

  // Must be mounted before any requireAuth-wrapped router below: app.use
  // applies its middleware to every /api/* request regardless of whether the
  // router passed alongside it actually handles that path, so requireAuth
  // would otherwise reject public/dev requests before they're ever reached.
  if (env.nodeEnv !== 'production') {
    app.use('/api', devRoutes)
  }

  app.use('/api', requireAuth, chatRoutes)
  app.use('/api', requireAuth, projectsRoutes)
  app.use('/api', requireAuth, agentsRoutes)
  app.use('/api', requireAuth, conversationsRoutes)
  app.use('/api', requireAuth, dashboardRoutes)
  app.use('/api', requireAuth, activityRoutes)
  app.use('/api', requireAuth, notificationsRoutes)
  app.use('/api', requireAuth, preferencesRoutes)

  app.use(notFound)
  app.use(errorHandler)

  return app
}
