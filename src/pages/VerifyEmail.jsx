import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import Button from '../components/Button'
import { verifyEmailRequest, resendVerificationRequest } from '../components/auth/authApi'
import './Auth.css'

function VerifyEmail() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') ?? ''
  const [status, setStatus] = useState(token ? 'verifying' : 'missing')
  const [error, setError] = useState(null)
  const [resendEmail, setResendEmail] = useState('')
  const [resendStatus, setResendStatus] = useState(null)

  // Verifying a token is single-use and non-idempotent (the token is
  // deleted on first use). In development, React StrictMode intentionally
  // mounts effects twice, which would otherwise send this request twice —
  // the first call would succeed but its result gets discarded, and the
  // second would correctly report the token as already used. This ref
  // survives that double-mount (unlike component state) and makes sure the
  // request only ever fires once per real mount.
  const hasRequestedRef = useRef(false)

  useEffect(() => {
    if (!token || hasRequestedRef.current) return undefined
    hasRequestedRef.current = true

    let cancelled = false
    verifyEmailRequest(token)
      .then(() => {
        if (!cancelled) setStatus('success')
      })
      .catch((err) => {
        if (!cancelled) {
          setStatus('error')
          setError(err.message)
        }
      })

    return () => {
      cancelled = true
    }
  }, [token])

  async function handleResend(event) {
    event.preventDefault()
    setResendStatus('sending')
    try {
      await resendVerificationRequest(resendEmail)
    } finally {
      setResendStatus('sent')
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        {status === 'verifying' && (
          <>
            <h1>Verifying your email...</h1>
            <p>Just a moment.</p>
          </>
        )}

        {status === 'success' && (
          <>
            <h1>Email verified</h1>
            <p>Your email address has been confirmed. You can now log in.</p>
            <Button to="/login" variant="primary">
              Continue to login
            </Button>
          </>
        )}

        {(status === 'error' || status === 'missing') && (
          <>
            <h1>Verification link invalid</h1>
            <p>{status === 'missing' ? 'No verification token was provided.' : error}</p>

            <form onSubmit={handleResend} className="auth-form">
              <label>
                Email
                <input
                  type="email"
                  value={resendEmail}
                  onChange={(event) => setResendEmail(event.target.value)}
                  required
                  autoComplete="email"
                />
              </label>
              <Button type="submit" variant="secondary" disabled={resendStatus === 'sending'}>
                {resendStatus === 'sending' ? 'Sending...' : 'Send a new link'}
              </Button>
            </form>

            {resendStatus === 'sent' && (
              <p className="auth-switch">If that email needs verification, a new link has been sent.</p>
            )}
          </>
        )}

        <p className="auth-switch">
          <Link to="/login">Back to login</Link>
        </p>
      </div>
    </div>
  )
}

export default VerifyEmail
