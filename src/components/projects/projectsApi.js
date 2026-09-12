import { apiRequest } from '../../lib/apiClient'

export function fetchProjects() {
  return apiRequest('/api/projects')
}

export function fetchProject(id) {
  return apiRequest(`/api/projects/${id}`)
}

export function createProjectRequest(project) {
  return apiRequest('/api/projects', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(project),
  })
}

export function updateProjectRequest(id, fields) {
  return apiRequest(`/api/projects/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(fields),
  })
}

export function deleteProjectRequest(id) {
  return apiRequest(`/api/projects/${id}`, { method: 'DELETE' })
}
