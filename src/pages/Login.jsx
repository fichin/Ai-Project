import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import Button from '../components/Button'
import PasswordInput from '../components/PasswordInput'
import CheckYourEmailPanel from '../components/auth/CheckYourEmailPanel'
import { useAuth } from '../context/useAuth'
import { usePreferences } from '../context/usePreferences'
import { fetchPreferences } from '../components/preferences/preferencesApi'
import { useSubmitState } from '../hooks/useSubmitState'
import './Auth.css'

function Login() {
  const { user, isLoading, login } = useAuth()
  const { preferences } = usePreferences()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const { error, setError, isSubmitting, submit } = useSubmitState()
  const [unverifiedEmail, setUnverifiedEmail] = useState(null)

  const destination = location.state?.from ?? preferences?.defaultLandingPage ?? '/dashboard'

  if (!isLoading && user) {
    return <Navigate to={destination} replace />
  }

  async function handleSubmit(event) {
    event.preventDefault()
    await submit(
      async () => {
        await login(email, password)
        // The preferences context may not have finished fetching the fresh
        // session's preferences yet (it starts loading the instant `user` is
        // set, same render this awaits past) — fetch directly so a saved
        // default landing page is honored from the very first post-login
        // navigation, not just on subsequent visits.
        let target = location.state?.from
        if (!target) {
          target = await fetchPreferences()
            .then((prefs) => prefs.defaultLandingPage)
            .catch(() => '/dashboard')
        }
        navigate(target, { replace: true })
      },
      {
        onError: (err) => {
          if (err.code === 'EMAIL_NOT_VERIFIED') {
            setUnverifiedEmail(err.email ?? email.trim().toLowerCase())
          } else {
            setError(err.message)
          }
        },
      },
    )
  }

  if (unverifiedEmail) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <CheckYourEmailPanel
            email={unverifiedEmail}
            title="Verify your email"
            description={`Please verify ${unverifiedEmail} before accessing your workspace.`}
          >
            <Button variant="primary" onClick={() => setUnverifiedEmail(null)}>
              Back to login
            </Button>
          </CheckYourEmailPanel>
        </div>
      </div>
    )
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>Welcome back</h1>
        <p>Log in to continue to your workspace.</p>

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
          <label>
            <span className="auth-label-row">
              Password
              <Link to="/forgot-password" className="auth-inline-link">
                Forgot password?
              </Link>
            </span>
            <PasswordInput
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              autoComplete="current-password"
            />
          </label>
          <Button type="submit" variant="primary" disabled={isSubmitting}>
            {isSubmitting ? 'Logging in...' : 'Log in'}
          </Button>
        </form>

        <p className="auth-switch">
          Don&apos;t have an account? <Link to="/register" state={location.state}>Sign up</Link>
        </p>
      </div>
    </div>
  )
}

export default Login
