import { describe, expect, it, vi } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useSubmitState } from './useSubmitState'

describe('useSubmitState', () => {
  it('starts with no error and not submitting', () => {
    const { result } = renderHook(() => useSubmitState())

    expect(result.current.error).toBeNull()
    expect(result.current.isSubmitting).toBe(false)
  })

  it('sets isSubmitting while the action is in flight, then clears it on success', async () => {
    let resolveAction
    const action = vi.fn(() => new Promise((res) => (resolveAction = res)))
    const { result } = renderHook(() => useSubmitState())

    let submitPromise
    act(() => {
      submitPromise = result.current.submit(action)
    })
    expect(result.current.isSubmitting).toBe(true)

    await act(async () => {
      resolveAction()
      await submitPromise
    })

    expect(result.current.isSubmitting).toBe(false)
    expect(result.current.error).toBeNull()
  })

  it('clears a previous error when a new submit starts', async () => {
    const failing = vi.fn().mockRejectedValue(new Error('First failure'))
    const { result } = renderHook(() => useSubmitState())

    await act(async () => result.current.submit(failing))
    expect(result.current.error).toBe('First failure')

    let resolveAction
    const succeeding = vi.fn(() => new Promise((res) => (resolveAction = res)))
    act(() => {
      result.current.submit(succeeding)
    })
    await waitFor(() => expect(result.current.error).toBeNull())

    await act(async () => resolveAction())
  })

  it('sets error to the thrown error message on failure', async () => {
    const action = vi.fn().mockRejectedValue(new Error('Something went wrong'))
    const { result } = renderHook(() => useSubmitState())

    await act(async () => result.current.submit(action))

    expect(result.current.error).toBe('Something went wrong')
    expect(result.current.isSubmitting).toBe(false)
  })

  it('calls onError instead of setting the default error when provided', async () => {
    const action = vi.fn().mockRejectedValue({ code: 'EMAIL_NOT_VERIFIED', email: 'a@b.com' })
    const onError = vi.fn()
    const { result } = renderHook(() => useSubmitState())

    await act(async () => result.current.submit(action, { onError }))

    expect(onError).toHaveBeenCalledWith({ code: 'EMAIL_NOT_VERIFIED', email: 'a@b.com' })
    expect(result.current.error).toBeNull()
    expect(result.current.isSubmitting).toBe(false)
  })

  it('exposes setError so callers can set errors outside of submit', () => {
    const { result } = renderHook(() => useSubmitState())

    act(() => result.current.setError('Custom error'))

    expect(result.current.error).toBe('Custom error')
  })
})
