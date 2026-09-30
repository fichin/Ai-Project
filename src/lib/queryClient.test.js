import { describe, expect, it } from 'vitest'
import { isColdStartFailure, queryClient } from './queryClient'

function makeHttpError(status) {
  const error = new Error('The server returned an error. Please try again.')
  error.status = status
  return error
}

function makeAbortError() {
  const error = new Error('The operation was aborted.')
  error.name = 'AbortError'
  return error
}

describe('isColdStartFailure', () => {
  it('returns true for a status-less network error (fetch could not reach the server)', () => {
    expect(isColdStartFailure(new Error("Couldn't reach the server."))).toBe(true)
  })

  it('returns false for a real HTTP error response', () => {
    expect(isColdStartFailure(makeHttpError(404))).toBe(false)
    expect(isColdStartFailure(makeHttpError(500))).toBe(false)
  })

  it('returns false for an aborted request', () => {
    expect(isColdStartFailure(makeAbortError())).toBe(false)
  })
})

describe('queryClient default retry behavior', () => {
  const { retry, retryDelay } = queryClient.getDefaultOptions().queries

  it('retries a network failure up to 2 times, then gives up', () => {
    const error = new Error("Couldn't reach the server.")
    expect(retry(0, error)).toBe(true)
    expect(retry(1, error)).toBe(true)
    expect(retry(2, error)).toBe(false)
  })

  it('never retries a real HTTP error response, even on the first failure', () => {
    expect(retry(0, makeHttpError(500))).toBe(false)
  })

  it('never retries an aborted request', () => {
    expect(retry(0, makeAbortError())).toBe(false)
  })

  it('backs off between attempts, capped at 4 seconds', () => {
    expect(retryDelay(0)).toBe(1000)
    expect(retryDelay(1)).toBe(2000)
    expect(retryDelay(5)).toBe(4000)
  })
})
