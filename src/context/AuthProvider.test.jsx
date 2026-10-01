import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { AuthProvider } from './AuthProvider'
import { useAuth } from './useAuth'
import { fetchCurrentUser, loginRequest } from '../components/auth/authApi'

vi.mock('../components/auth/authApi')

describe('AuthProvider — memoized context value', () => {
  beforeEach(() => {
    fetchCurrentUser.mockResolvedValue({ user: null })
  })

  it('keeps the same context value reference across a re-render when user/isLoading are unchanged', async () => {
    const { result, rerender } = renderHook(() => useAuth(), { wrapper: AuthProvider })

    await waitFor(() => expect(result.current.isLoading).toBe(false))
    const firstValue = result.current

    rerender()

    expect(result.current).toBe(firstValue)
  })

  it('keeps login/register/logout/updateProfile referentially stable across renders', async () => {
    const { result, rerender } = renderHook(() => useAuth(), { wrapper: AuthProvider })
    await waitFor(() => expect(result.current.isLoading).toBe(false))
    const { login, logout, register, updateProfile } = result.current

    rerender()

    expect(result.current.login).toBe(login)
    expect(result.current.logout).toBe(logout)
    expect(result.current.register).toBe(register)
    expect(result.current.updateProfile).toBe(updateProfile)
  })

  it('produces a new context value when the user actually changes (login)', async () => {
    loginRequest.mockResolvedValue({ user: { id: 1, name: 'Ada' } })

    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider })
    await waitFor(() => expect(result.current.isLoading).toBe(false))
    const before = result.current

    await act(async () => {
      await result.current.login('ada@example.com', 'password')
    })

    expect(result.current).not.toBe(before)
    expect(result.current.user).toEqual({ id: 1, name: 'Ada' })
  })
})

function makeUnauthorizedError() {
  return Object.assign(new Error('Authentication required.'), { status: 401 })
}

describe('AuthProvider — session restore retry on 401', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('retries once after a 401 and recovers if the retry succeeds', async () => {
    vi.useFakeTimers()
    fetchCurrentUser.mockRejectedValueOnce(makeUnauthorizedError()).mockResolvedValueOnce({
      user: { id: 1, name: 'Ada' },
    })

    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider })

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000)
    })

    expect(fetchCurrentUser).toHaveBeenCalledTimes(2)
    expect(result.current.isLoading).toBe(false)
    expect(result.current.user).toEqual({ id: 1, name: 'Ada' })
  })

  it('gives up after a second consecutive 401 and treats the session as logged out', async () => {
    vi.useFakeTimers()
    fetchCurrentUser.mockRejectedValue(makeUnauthorizedError())

    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider })

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000)
    })

    expect(fetchCurrentUser).toHaveBeenCalledTimes(2)
    expect(result.current.isLoading).toBe(false)
    expect(result.current.user).toBeNull()
  })

  it('does not retry a non-401 error', async () => {
    fetchCurrentUser.mockRejectedValueOnce(new Error('Internal server error'))

    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider })
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(fetchCurrentUser).toHaveBeenCalledTimes(1)
    expect(result.current.user).toBeNull()
  })
})
