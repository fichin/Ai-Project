import { Resend } from 'resend'
import { env } from '../../../config/env.js'

let client = null

function getClient() {
  if (!env.resendApiKey) {
    throw new Error('RESEND_API_KEY is not configured.')
  }

  if (!client) {
    client = new Resend(env.resendApiKey)
  }

  return client
}

// Resend's shared onboarding sender — works with no domain verification,
// but only delivers to the email address the Resend account itself was
// signed up with (Resend's sandbox restriction until a custom domain is
// verified). Swap this for a verified "from" address once one exists.
const FROM_ADDRESS = 'onboarding@resend.dev'

// Not exercised until RESEND_API_KEY is set — getMailProvider() only
// selects this provider once a key is configured, and getClient() re-checks
// before ever touching the network.
export const resendProvider = {
  name: 'resend',
  async send({ to, subject, body }) {
    const resend = getClient()

    const { data, error } = await resend.emails.send({
      from: FROM_ADDRESS,
      to,
      subject,
      text: body,
    })

    if (error) {
      throw new Error(`Resend failed to send email: ${error.message ?? error}`)
    }

    // sendEmail() callers fire-and-forget (see auth.routes.js) rather than
    // awaiting/inspecting the result, so this is the only place a
    // successful send (and its message id) is ever visible.
    console.log(`[mail:resend] Sent "${subject}" to ${to} (id: ${data?.id})`)

    return data
  },
}
