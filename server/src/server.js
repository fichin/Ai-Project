import { createApp } from './app.js'
import { env } from './config/env.js'
import { getDb } from './db/index.js'

getDb()

const app = createApp()

app.listen(env.port, () => {
  console.log(`API server listening on http://localhost:${env.port}`)
})
