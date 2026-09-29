import { apiRequest } from '../../lib/apiClient'

export function fetchPreferences() {
  return apiRequest('/api/preferences')
}

export function updatePreferencesRequest(fields) {
  return apiRequest('/api/preferences', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(fields),
  })
}
