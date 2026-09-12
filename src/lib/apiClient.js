export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000'

export async function apiRequest(path, options) {
  let response

  try {
    response = await fetch(`${API_BASE_URL}${path}`, { ...options, credentials: 'include' })
  } catch {
    throw new Error(
      "Couldn't reach the server. Make sure the backend is running at " + API_BASE_URL + ' and try again.',
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
