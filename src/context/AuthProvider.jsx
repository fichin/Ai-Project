import { useCallback, useEffect, useMemo, useState } from 'react'
import { AuthContext } from './AuthContext'
import {
  fetchCurrentUser,
  loginRequest,
  registerRequest,
  logoutRequest,
  updateProfileRequest,
} from '../components/auth/authApi'

// A 401 here specifically can be a transient race rather than a genuinely
// missing/expired session — same reasoning as queryClient.js's
// isUnauthorized, but this call sits outside TanStack Query (it runs once
// on mount, before there's a user to key any query on), so it needs its
// own one-retry safety net. A short delay first gives whatever caused the
// race (e.g. several concurrent credentialed cross-site fetches firing on
// first load) a moment to clear, matching queryClient's own first-retry
// backoff. Any other error (including a second 401) is not retried.
function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function fetchCurrentUserWithRetry() {
  try {
    return await fetchCurrentUser()
  } catch (error) {
    if (error?.status !== 401) throw error
    await wait(1000)
    return fetchCurrentUser()
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  async function restoreSession() {
    try {
      const data = await fetchCurrentUserWithRetry()
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
