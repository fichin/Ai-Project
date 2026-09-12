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
import devRoutes from './routes/dev.routes.js'
import { notFound } from './middleware/notFound.js'
import { errorHandler } from './middleware/errorHandler.js'
import { requireAuth } from './middleware/requireAuth.js'

export function createApp() {
  const app = express()

  app.use(cors({ origin: env.corsOrigin, credentials: true }))
  app.use(express.json())

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

  app.use(notFound)
  app.use(errorHandler)

  return app
}
