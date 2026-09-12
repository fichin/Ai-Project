import { useEffect, useState } from 'react'
import { AuthContext } from './AuthContext'
import {
  fetchCurrentUser,
  loginRequest,
  registerRequest,
  logoutRequest,
  updateProfileRequest,
} from '../components/auth/authApi'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  async function restoreSession() {
    try {
      const data = await fetchCurrentUser()
      setUser(data.user)
    } catch {
      setUser(null)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    // Restoring the logged-in user from the session cookie on mount, same
    // pattern as the other pages' initial-data-fetch effects.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    restoreSession()
  }, [])

  async function login(email, password) {
    const data = await loginRequest(email, password)
    setUser(data.user)
  }

  async function register(email, password, name) {
    // No session is created here — the account needs email verification
    // before it can be used, so there's no `user` to store yet.
    return registerRequest(email, password, name)
  }

  async function logout() {
    await logoutRequest()
    setUser(null)
  }

  // Single place that writes profile changes back into the shared session
  // user — the Navbar, sidebar, and Settings page all read from the same
  // `user` value, so this is the only update any of them need to trigger.
  async function updateProfile(fields) {
    const data = await updateProfileRequest(fields)
    setUser(data.user)
    return data.user
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout, updateProfile }}>
      {children}
    </AuthContext.Provider>
  )
}
