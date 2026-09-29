import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { apiRequest, isAbortError, API_BASE_URL } from './apiClient'

function makeAbortError() {
  const error = new Error('The operation was aborted.')
  error.name = 'AbortError'
  return error
}

function mockFetchResolvedWith({ ok = true, status = 200, json }) {
  globalThis.fetch = vi.fn().mockResolvedValue({
    ok,
    status,
    json: json ?? (async () => ({})),
  })
}

describe('apiRequest', () => {
  beforeEach(() => {
    globalThis.fetch = vi.fn()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('requests the given path against the configured API base URL with credentials included', async () => {
    mockFetchResolvedWith({ json: async () => ({ ok: true }) })

    await apiRequest('/api/agents')

    expect(globalThis.fetch).toHaveBeenCalledWith(`${API_BASE_URL}/api/agents`, { credentials: 'include' })
  })

  it('resolves with the parsed JSON body on a successful response', async () => {
    mockFetchResolvedWith({ json: async () => ({ id: 1, name: 'Research Agent' }) })

    const data = await apiRequest('/api/agents/1')

    expect(data).toEqual({ id: 1, name: 'Research Agent' })
  })

  it('resolves with null for a 204 No Content response without parsing a body', async () => {
    const json = vi.fn()
    mockFetchResolvedWith({ status: 204, json })

    const data = await apiRequest('/api/agents/1', { method: 'DELETE' })

    expect(data).toBeNull()
    expect(json).not.toHaveBeenCalled()
  })

  it('throws the server-provided error message and carries structured fields for a non-OK response', async () => {
    mockFetchResolvedWith({
      ok: false,
      status: 403,
      json: async () => ({ error: 'Email not verified', code: 'EMAIL_NOT_VERIFIED', email: 'a@b.com' }),
    })

    await expect(apiRequest('/api/auth/login')).rejects.toMatchObject({
      message: 'Email not verified',
      status: 403,
      code: 'EMAIL_NOT_VERIFIED',
      email: 'a@b.com',
    })
  })

  it('falls back to a generic message when a non-OK response has no error field', async () => {
    mockFetchResolvedWith({ ok: false, status: 500, json: async () => ({}) })

    await expect(apiRequest('/api/agents')).rejects.toThrow('The server returned an error. Please try again.')
  })

  it('throws a friendly message when the response body cannot be parsed as JSON', async () => {
    mockFetchResolvedWith({
      json: async () => {
        throw new Error('Unexpected token')
      },
    })

    await expect(apiRequest('/api/agents')).rejects.toThrow('Received an unexpected response from the server.')
  })

  it('throws a friendly message when the network request itself fails', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('network down'))

    await expect(apiRequest('/api/agents')).rejects.toThrow(
      `Couldn't reach the server. Make sure the backend is running at ${API_BASE_URL} and try again.`,
    )
  })

  it('forwards an AbortSignal from options straight through to fetch', async () => {
    mockFetchResolvedWith({ json: async () => ({ ok: true }) })
    const controller = new AbortController()

    await apiRequest('/api/agents', { signal: controller.signal })

    expect(globalThis.fetch).toHaveBeenCalledWith(`${API_BASE_URL}/api/agents`, {
      signal: controller.signal,
      credentials: 'include',
    })
  })

  it('rejects with the original AbortError (not the generic network-error message) when the request is aborted', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(makeAbortError())

    const rejection = apiRequest('/api/agents', { signal: new AbortController().signal })

    await expect(rejection).rejects.toThrow('The operation was aborted.')
    await expect(rejection).rejects.toMatchObject({ name: 'AbortError' })
  })
})

describe('isAbortError', () => {
  it('returns true for an AbortError', () => {
    expect(isAbortError(makeAbortError())).toBe(true)
  })

  it('returns false for a regular error', () => {
    expect(isAbortError(new Error('boom'))).toBe(false)
  })

  it('returns false for null/undefined without throwing', () => {
    expect(isAbortError(null)).toBe(false)
    expect(isAbortError(undefined)).toBe(false)
  })
})
