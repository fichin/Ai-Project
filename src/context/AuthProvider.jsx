import { useCallback, useEffect, useMemo, useState } from 'react'
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

  // Stable across renders (none of these read `user`/`isLoading` from the
  // closure, only call setUser), so memoizing the context value below
  // actually holds — PreferencesProvider and every other useAuth() consumer
  // only re-render when `user`/`isLoading` genuinely change, not on every
  // AuthProvider render.
  const login = useCallback(async (email, password) => {
    const data = await loginRequest(email, password)
    setUser(data.user)
  }, [])

  const register = useCallback(async (email, password, name) => {
    // No session is created here — the account needs email verification
    // before it can be used, so there's no `user` to store yet.
    return registerRequest(email, password, name)
  }, [])

  const logout = useCallback(async () => {
    await logoutRequest()
    setUser(null)
  }, [])

  // Single place that writes profile changes back into the shared session
  // user — the Navbar, sidebar, and Settings page all read from the same
  // `user` value, so this is the only update any of them need to trigger.
  const updateProfile = useCallback(async (fields) => {
    const data = await updateProfileRequest(fields)
    setUser(data.user)
    return data.user
  }, [])

  const value = useMemo(
    () => ({ user, isLoading, login, register, logout, updateProfile }),
    [user, isLoading, login, register, logout, updateProfile],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
