import { getDb } from '../../../db/index.js'
import { env } from '../../../config/env.js'

// No real email provider is connected — this project stays fully local and
// free. Emails are logged to the console and, outside production, persisted
// to a local "outbox" table so verification/reset links can be retrieved
// during testing (see routes/dev.routes.js).
export const logProvider = {
  name: 'log',
  async send({ to, subject, body }) {
    console.log(`[mail:log] To: ${to}\nSubject: ${subject}\n\n${body}\n`)

    if (env.nodeEnv !== 'production') {
      getDb()
        .prepare('INSERT INTO dev_outbox_emails (to_email, subject, body) VALUES (?, ?, ?)')
        .run(to, subject, body)
    }
  },
}
