import { describe, expect, it, vi, beforeEach } from 'vitest'
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
