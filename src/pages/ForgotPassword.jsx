import { useState } from 'react'
import { Link } from 'react-router-dom'
import Button from '../components/Button'
import DevEmailPreview from '../components/auth/DevEmailPreview'
import { forgotPasswordRequest } from '../components/auth/authApi'
import { required } from '../lib/validation'
import { useSubmitState } from '../hooks/useSubmitState'
import './Auth.css'

function ForgotPassword() {
  const [email, setEmail] = useState('')
  const { error, setError, isSubmitting, submit } = useSubmitState()
  const [submittedEmail, setSubmittedEmail] = useState(null)
  const [refreshKey, setRefreshKey] = useState(0)

  async function handleSubmit(event) {
    event.preventDefault()

    const validationError = required(email, 'Email is required.')
    if (validationError) {
      setError(validationError)
      return
    }

    await submit(async () => {
      await forgotPasswordRequest(email)
      setSubmittedEmail(email.trim().toLowerCase())
    })
  }

  async function handleResend() {
    await forgotPasswordRequest(submittedEmail)
    setRefreshKey((key) => key + 1)
  }

  if (submittedEmail) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <h1>Check your email</h1>
          <p>If an account exists for {submittedEmail}, we&apos;ve sent a link to reset your password.</p>

          {import.meta.env.DEV && <DevEmailPreview email={submittedEmail} refreshKey={refreshKey} />}

          <p className="auth-switch">
            <button type="button" className="auth-link-button" onClick={handleResend}>
              Resend link
            </button>
          </p>
          <p className="auth-switch">
            <Link to="/login">Back to login</Link>
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>Forgot your password?</h1>
        <p>Enter your email and we&apos;ll send you a reset link.</p>

        {error && <p className="auth-error">{error}</p>}

        <form onSubmit={handleSubmit} className="auth-form">
          <label>
            Email
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              autoComplete="email"
            />
          </label>
          <Button type="submit" variant="primary" disabled={isSubmitting}>
            {isSubmitting ? 'Sending...' : 'Send reset link'}
          </Button>
        </form>

        <p className="auth-switch">
          Remembered your password? <Link to="/login">Log in</Link>
        </p>
      </div>
    </div>
  )
}

export default ForgotPassword
