import { useState } from 'react'
import { Link, Navigate, useLocation } from 'react-router-dom'
import Button from '../components/Button'
import CheckYourEmailPanel from '../components/auth/CheckYourEmailPanel'
import { useAuth } from '../context/useAuth'
import './Auth.css'

function validate({ name, email, password, confirmPassword }) {
  if (!name.trim()) return 'Name is required.'
  if (!email.trim()) return 'Email is required.'
  if (password.length < 8) return 'Password must be at least 8 characters.'
  if (password !== confirmPassword) return 'Passwords do not match.'
  return null
}

function Register() {
  const { user, isLoading, register } = useAuth()
  const location = useLocation()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [registeredEmail, setRegisteredEmail] = useState(null)

  if (!isLoading && user) {
    return <Navigate to={location.state?.from ?? '/assistant'} replace />
  }

  async function handleSubmit(event) {
    event.preventDefault()

    const validationError = validate({ name, email, password, confirmPassword })
    if (validationError) {
      setError(validationError)
      return
    }

    setError(null)
    setIsSubmitting(true)
    try {
      const data = await register(email, password, name)
      setRegisteredEmail(data.email)
    } catch (err) {
      setError(err.message)
    } finally {
      setIsSubmitting(false)
    }
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
            Confirm password
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
