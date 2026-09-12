import { apiRequest } from '../../lib/apiClient'

export function fetchAgents() {
  return apiRequest('/api/agents')
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
