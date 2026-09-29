import { describe, expect, it, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { AuthProvider } from './AuthProvider'
import { PreferencesProvider } from './PreferencesProvider'
import { useAuth } from './useAuth'
import { usePreferences } from './usePreferences'
import { DEFAULT_PREFERENCES } from '../lib/preferences'
import { fetchCurrentUser, updateProfileRequest } from '../components/auth/authApi'
import { fetchPreferences, updatePreferencesRequest } from '../components/preferences/preferencesApi'

vi.mock('../components/auth/authApi')
vi.mock('../components/preferences/preferencesApi')

function Wrapper({ children }) {
  return (
    <AuthProvider>
      <PreferencesProvider>{children}</PreferencesProvider>
    </AuthProvider>
  )
}

describe('PreferencesProvider — memoized context value', () => {
  beforeEach(() => {
    localStorage.clear()
    fetchCurrentUser.mockResolvedValue({ user: { id: 1, name: 'Ada' } })
    fetchPreferences.mockResolvedValue({ ...DEFAULT_PREFERENCES })
  })

  it('keeps the same context value reference across an unrelated auth change (profile update)', async () => {
    updateProfileRequest.mockResolvedValue({ user: { id: 1, name: 'Ada Lovelace' } })

    const { result } = renderHook(() => ({ auth: useAuth(), prefs: usePreferences() }), {
      wrapper: Wrapper,
    })

    await waitFor(() => expect(result.current.auth.isLoading).toBe(false))
    await waitFor(() => expect(result.current.prefs.isLoading).toBe(false))
    const prefsBefore = result.current.prefs

    await act(async () => {
      await result.current.auth.updateProfile({ name: 'Ada Lovelace' })
    })

    // The user's name changed (a real, necessary auth re-render)...
    expect(result.current.auth.user.name).toBe('Ada Lovelace')
    // ...but preferences data never changed, so consumers of usePreferences()
    // should not see a new object reference and re-render for no reason.
    expect(result.current.prefs).toBe(prefsBefore)
  })

  it('produces a new value when preferences actually change', async () => {
    updatePreferencesRequest.mockResolvedValue({ ...DEFAULT_PREFERENCES, theme: 'light' })

    const { result } = renderHook(() => usePreferences(), { wrapper: Wrapper })
    await waitFor(() => expect(result.current.isLoading).toBe(false))
    const before = result.current

    await act(async () => {
      await result.current.updatePreferences({ theme: 'light' })
    })

    expect(result.current).not.toBe(before)
    expect(result.current.preferences.theme).toBe('light')
  })

  it('rolls back to the correct prior preferences (not a stale closure) when a later update fails', async () => {
    updatePreferencesRequest
      .mockResolvedValueOnce({ ...DEFAULT_PREFERENCES, theme: 'light' })
      .mockRejectedValueOnce(new Error('save failed'))

    const { result } = renderHook(() => usePreferences(), { wrapper: Wrapper })
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    await act(async () => {
      await result.current.updatePreferences({ theme: 'light' })
    })
    expect(result.current.preferences.theme).toBe('light')

    await act(async () => {
      await result.current.updatePreferences({ accent: 'purple' }).catch(() => {})
    })

    // The rollback must restore the state from just before this call
    // (theme: 'light'), not a stale closure captured on the provider's very
    // first render (theme: the original default) — this is what
    // `updatePreferences` reading `preferencesRef.current` (instead of
    // closing over `preferences` directly) guarantees.
    expect(result.current.preferences.theme).toBe('light')
  })
})
