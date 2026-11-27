import { createApp } from './app.js'
import { env } from './config/env.js'
import { assertSafeDevDatabase, UnsafeDatabaseError } from './config/databaseGuard.js'

try {
  assertSafeDevDatabase({
    databaseUrl: env.databaseUrl,
    nodeEnv: env.nodeEnv,
    onRender: env.onRender,
    devSupabaseRef: env.devDatabaseSupabaseRef,
  })
} catch (error) {
  if (!(error instanceof UnsafeDatabaseError)) throw error
  console.error(error.message)
  process.exit(1)
}

const app = createApp()

app.listen(env.port, () => {
  console.log(`API server listening on http://localhost:${env.port}`)
})
