import { useState } from 'react'
import DevEmailPreview from './DevEmailPreview'
import Button from '../Button'
import { resendVerificationRequest } from './authApi'

function CheckYourEmailPanel({ email, title, description, children }) {
  const [resendStatus, setResendStatus] = useState(null)
  const [refreshKey, setRefreshKey] = useState(0)

  async function handleResend() {
    setResendStatus('sending')
    try {
      await resendVerificationRequest(email)
    } finally {
      setResendStatus('sent')
      setRefreshKey((key) => key + 1)
    }
  }

  return (
    <>
      <h1>{title}</h1>
      <p>{description}</p>

      {import.meta.env.DEV && <DevEmailPreview email={email} refreshKey={refreshKey} />}

      <div className="auth-form">
        <Button variant="secondary" onClick={handleResend} disabled={resendStatus === 'sending'}>
          {resendStatus === 'sending' ? 'Sending...' : 'Resend verification email'}
        </Button>
        {children}
      </div>

      {resendStatus === 'sent' && <p className="auth-switch">A new verification link has been sent.</p>}
    </>
  )
}

export default CheckYourEmailPanel
