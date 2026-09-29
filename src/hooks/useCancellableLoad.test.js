import { describe, expect, it, vi } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { useCancellableLoad } from './useCancellableLoad'

function deferred() {
  let resolve
  let reject
  const promise = new Promise((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

function makeAbortError() {
  const error = new Error('The operation was aborted.')
  error.name = 'AbortError'
  return error
}

describe('useCancellableLoad', () => {
  it('calls loadFn once on mount with an AbortSignal, and reflects loading/success', async () => {
    const d = deferred()
    const loadFn = vi.fn().mockReturnValue(d.promise)

    const { result } = renderHook(() => useCancellableLoad(loadFn))

    expect(result.current.isLoading).toBe(true)
    expect(loadFn).toHaveBeenCalledTimes(1)
    expect(loadFn.mock.calls[0][0]).toBeInstanceOf(AbortSignal)

    await act(async () => d.resolve())

    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.error).toBeNull()
  })

  it('sets error to the rejection message on a real failure', async () => {
    const loadFn = vi.fn().mockRejectedValue(new Error('network down'))

    const { result } = renderHook(() => useCancellableLoad(loadFn))

    await waitFor(() => expect(result.current.error).toBe('network down'))
    expect(result.current.isLoading).toBe(false)
  })

  it('does not surface an AbortError as a user-facing error', async () => {
    const loadFn = vi.fn().mockRejectedValue(makeAbortError())

    const { result } = renderHook(() => useCancellableLoad(loadFn))

    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.error).toBeNull()
  })

  it('aborts the in-flight request when the component unmounts', async () => {
    const d = deferred()
    let seenSignal
    const loadFn = vi.fn((signal) => {
      seenSignal = signal
      return d.promise
    })

    const { unmount } = renderHook(() => useCancellableLoad(loadFn))

    expect(seenSignal.aborted).toBe(false)
    unmount()
    expect(seenSignal.aborted).toBe(true)
  })

  it('retry() aborts a still-pending previous call, and its late response cannot override the newer one', async () => {
    const first = deferred()
    const second = deferred()
    const signals = []
    const loadFn = vi
      .fn()
      .mockImplementationOnce((signal) => {
        signals.push(signal)
        return new Promise((res, rej) => {
          signal.addEventListener('abort', () => rej(makeAbortError()))
          first.promise.then(res)
        })
      })
      .mockImplementationOnce((signal) => {
        signals.push(signal)
        return second.promise
      })

    const { result } = renderHook(() => useCancellableLoad(loadFn))
    expect(loadFn).toHaveBeenCalledTimes(1)

    act(() => {
      result.current.retry()
    })
    expect(loadFn).toHaveBeenCalledTimes(2)
    expect(signals[0].aborted).toBe(true)

    await act(async () => second.resolve())
    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.error).toBeNull()

    // The stale first call finally "resolves" (already rejected by the
    // abort listener above) — must not flip isLoading back on or set error.
    first.resolve()
    await new Promise((r) => setTimeout(r, 0))
    expect(result.current.isLoading).toBe(false)
    expect(result.current.error).toBeNull()
  })
})
