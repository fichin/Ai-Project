import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import Button from '../components/Button'
import { resetPasswordRequest } from '../components/auth/authApi'
import { minLength, matches, firstError } from '../lib/validation'
import { useSubmitState } from '../hooks/useSubmitState'
import './Auth.css'

function ResetPassword() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') ?? ''
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const { error, setError, isSubmitting, submit } = useSubmitState()
  const [isDone, setIsDone] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()

    const validationError = !token
      ? 'This reset link is missing its token. Please request a new one.'
      : firstError(
          minLength(password, 8, 'Password must be at least 8 characters.'),
          matches(password, confirmPassword, 'Passwords do not match.'),
        )
    if (validationError) {
      setError(validationError)
      return
    }

    await submit(async () => {
      await resetPasswordRequest(token, password)
      setIsDone(true)
    })
  }

  if (isDone) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <h1>Password updated</h1>
          <p>Your password has been reset. You can now log in with your new password.</p>
          <Button to="/login" variant="primary">
            Go to login
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>Reset your password</h1>
        <p>Choose a new password for your account.</p>

        {error && <p className="auth-error">{error}</p>}
        {!token && (
          <p className="auth-error">This link is missing a reset token. Request a new one below.</p>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          <label>
            New password
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
            />
          </label>
          <label>
            Confirm new password
            <input
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
            />
          </label>
          <Button type="submit" variant="primary" disabled={isSubmitting}>
            {isSubmitting ? 'Resetting...' : 'Reset password'}
          </Button>
        </form>

        <p className="auth-switch">
          <Link to="/forgot-password">Request a new link</Link>
        </p>
      </div>
    </div>
  )
}

export default ResetPassword
