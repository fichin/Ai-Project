import { apiRequest } from '../../lib/apiClient'

// `options` is optional and forwarded as-is to apiRequest/fetch — pass
// `{ signal }` from an AbortController to make the request cancellable;
// every existing no-argument call site is unaffected.
export function fetchAgents(options) {
  return apiRequest('/api/agents', options)
}

export function createAgentRequest(agent) {
  return apiRequest('/api/agents', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(agent),
  })
}

export function updateAgentRequest(id, fields) {
  return apiRequest(`/api/agents/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(fields),
  })
}

export function deleteAgentRequest(id) {
  return apiRequest(`/api/agents/${id}`, { method: 'DELETE' })
}
