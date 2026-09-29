import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { PreferencesContext } from './PreferencesContext'
import { useAuth } from './useAuth'
import { DEFAULT_PREFERENCES, applyPreferencesToDocument } from '../lib/preferences'
import { fetchPreferences, updatePreferencesRequest } from '../components/preferences/preferencesApi'

function cacheKey(userId) {
  return `ai-project:preferences:${userId}`
}

function readCache(userId) {
  try {
    const raw = localStorage.getItem(cacheKey(userId))
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function writeCache(userId, preferences) {
  try {
    localStorage.setItem(cacheKey(userId), JSON.stringify(preferences))
  } catch {
    // Best-effort cache only — a private window or full storage quota just
    // means the next load fetches fresh from the backend instead.
  }
}

// The backend (GET/PATCH /api/preferences) is the source of truth; the
// localStorage cache below only exists to apply the user's last-known
// preferences instantly on load, before that first request resolves, so the
// UI doesn't flash back to defaults on every reload.
export function PreferencesProvider({ children }) {
  const { user, isLoading: isAuthLoading } = useAuth()
  const [preferences, setPreferences] = useState(DEFAULT_PREFERENCES)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (isAuthLoading) return

    let cancelled = false

    async function loadPreferences() {
      if (!user) {
        setPreferences(DEFAULT_PREFERENCES)
        applyPreferencesToDocument(DEFAULT_PREFERENCES)
        setIsLoading(false)
        return
      }

      const cached = readCache(user.id)
      if (cached) {
        setPreferences(cached)
        applyPreferencesToDocument(cached)
      }

      setIsLoading(true)
      try {
        const data = await fetchPreferences()
        if (cancelled) return
        setPreferences(data)
        applyPreferencesToDocument(data)
        writeCache(user.id, data)
      } catch {
        // Keep whatever was applied (cache or defaults) — a failed fetch
        // shouldn't leave the app in a broken/unstyled state.
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    // Same pattern as AuthProvider's restoreSession: the setState calls
    // happen inside this async helper, not synchronously in the effect body.
    loadPreferences()

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, isAuthLoading])

  // Kept fresh via a bodyless effect (same pattern as useCancellableLoad's
  // loadFnRef) so `updatePreferences` below can be a stable useCallback
  // with an empty dependency array — reading `preferences`/`user` directly
  // from state/useAuth() in its body would otherwise force it to change
  // reference on every preferences *and* every auth change, which defeats
  // memoizing the context value below.
  const preferencesRef = useRef(preferences)
  const userRef = useRef(user)
  useEffect(() => {
    preferencesRef.current = preferences
    userRef.current = user
  })

  const updatePreferences = useCallback(async (fields) => {
    const previous = preferencesRef.current
    const optimistic = { ...previous, ...fields }
    setPreferences(optimistic)
    applyPreferencesToDocument(optimistic)

    try {
      const updated = await updatePreferencesRequest(fields)
      setPreferences(updated)
      applyPreferencesToDocument(updated)
      if (userRef.current) writeCache(userRef.current.id, updated)
      return updated
    } catch (err) {
      setPreferences(previous)
      applyPreferencesToDocument(previous)
      throw err
    }
  }, [])

  // Memoized so that a re-render caused by *consuming AuthContext* (e.g.
  // login/logout/updateProfile, which don't touch preferences at all)
  // doesn't hand every usePreferences() consumer a new object reference —
  // without this, an auth change would needlessly re-render every
  // preference-driven part of the UI even though no preference changed.
  const value = useMemo(
    () => ({ preferences, isLoading, updatePreferences }),
    [preferences, isLoading, updatePreferences],
  )

  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>
}
