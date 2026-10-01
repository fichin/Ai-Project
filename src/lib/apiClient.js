// In production this resolves to '' (a relative /api/... request, same
// origin as the page) rather than the backend's own domain — see
// vercel.json's /api/:path* rewrite, which proxies those requests to the
// Render backend server-side. That's not just tidier routing: it's what
// makes the session cookie first-party. Calling the backend's own domain
// directly made it a cross-site request, and mobile browsers (Safari/iOS
// in particular, but increasingly Chrome too) block or strip a
// cross-site SameSite=None cookie far more aggressively than desktop
// does — consistently, not intermittently, which is exactly the "works
// on desktop, never works on mobile" bug this fixes. VITE_API_BASE_URL
// still wins when explicitly set (local dev, where frontend and backend
// run on different localhost ports with no proxy in front of them).
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || (import.meta.env.PROD ? '' : 'http://localhost:4000')

// A request cancelled via AbortController rejects with this — callers use it
// to skip setting error state for a cancellation the user never needs to see
// (e.g. "this request was superseded by a newer one"), while still treating
// every other rejection as a real, reportable error.
export function isAbortError(error) {
  return error?.name === 'AbortError'
}

// `options` is passed straight through to `fetch`, so it already accepts a
// standard `{ signal }` (from an AbortController) with no API change needed.
// The one thing that requires care: fetch rejects an aborted request with a
// DOMException named "AbortError", and that identity must survive past this
// function's own error handling below, or callers have no way to tell "the
// request was cancelled on purpose" apart from "the network actually failed"
// (see `isAbortError`).
export async function apiRequest(path, options) {
  let response

  try {
    response = await fetch(`${API_BASE_URL}${path}`, { ...options, credentials: 'include' })
  } catch (error) {
    if (isAbortError(error)) {
      throw error
    }
    throw new Error(
      "Couldn't reach the server. Make sure the backend is running at " + API_BASE_URL + ' and try again.',
      { cause: error },
    )
  }

  if (response.status === 204) {
    return null
  }

  let data
  try {
    data = await response.json()
  } catch {
    throw new Error('Received an unexpected response from the server.')
  }

  if (!response.ok) {
    const error = new Error(data?.error || 'The server returned an error. Please try again.')
    // Carry over structured fields (e.g. `code`, `email`) so callers can
    // react to a specific error kind, not just its message.
    if (data && typeof data === 'object') {
      Object.assign(error, data)
    }
    error.status = response.status
    throw error
  }

  return data
}
