import { useState } from 'react'
import { Link, Navigate, useLocation } from 'react-router-dom'
import Button from '../components/Button'
import PasswordInput from '../components/PasswordInput'
import CheckYourEmailPanel from '../components/auth/CheckYourEmailPanel'
import { useAuth } from '../context/useAuth'
import { usePreferences } from '../context/usePreferences'
import { required, passwordStrength, matches, firstError } from '../lib/validation'
import { useSubmitState } from '../hooks/useSubmitState'
import './Auth.css'

function validate({ name, email, password, confirmPassword }) {
  return firstError(
    required(name, 'Name is required.'),
    required(email, 'Email is required.'),
    passwordStrength(password),
    matches(password, confirmPassword, 'Passwords do not match.'),
  )
}

function Register() {
  const { user, isLoading, register } = useAuth()
  const { preferences } = usePreferences()
  const location = useLocation()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const { error, setError, isSubmitting, submit } = useSubmitState()
  const [registeredEmail, setRegisteredEmail] = useState(null)

  if (!isLoading && user) {
    return <Navigate to={location.state?.from ?? preferences?.defaultLandingPage ?? '/assistant'} replace />
  }

  async function handleSubmit(event) {
    event.preventDefault()

    const validationError = validate({ name, email, password, confirmPassword })
    if (validationError) {
      setError(validationError)
      return
    }

    await submit(
      async () => {
        const data = await register(email, password, name)
        setRegisteredEmail(data.email)
      },
      {
        onError: (err) => {
          // The backend's own message ("An account with this email already
          // exists.") is already specific, but pinning the wording here to
          // the status code (rather than string-matching the message) keeps
          // this working even if that copy changes later.
          setError(err.status === 409 ? 'This email is already registered.' : err.message)
        },
      },
    )
  }

  if (registeredEmail) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <CheckYourEmailPanel
            email={registeredEmail}
            title="Check your email"
            description={`We sent a verification link to ${registeredEmail}. Verify it to unlock your workspace.`}
          >
            <Button to="/login" state={location.state} variant="primary">
              Go to login
            </Button>
          </CheckYourEmailPanel>
        </div>
      </div>
    )
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>Create your account</h1>
        <p>Start building with your own workspace.</p>

        {error && <p className="auth-error">{error}</p>}

        <form onSubmit={handleSubmit} className="auth-form">
          <label>
            Name
            <input
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
              autoComplete="name"
            />
          </label>
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
          <label>
            Password
            <PasswordInput
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
            />
          </label>
          <p className="auth-field-hint">At least 8 characters, with one uppercase letter and one number.</p>
          <label>
            Confirm password
            <PasswordInput
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
            />
          </label>
          <Button type="submit" variant="primary" disabled={isSubmitting}>
            {isSubmitting ? 'Creating account...' : 'Sign up'}
          </Button>
        </form>

        <p className="auth-switch">
          Already have an account? <Link to="/login" state={location.state}>Log in</Link>
        </p>
      </div>
    </div>
  )
}

export default Register
