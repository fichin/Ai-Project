import { apiRequest } from '../../lib/apiClient'

// `options` is optional and forwarded as-is to apiRequest/fetch — pass
// `{ signal }` from an AbortController to make the request cancellable;
// every existing no-argument call site is unaffected.
export function fetchProjects(options) {
  return apiRequest('/api/projects', options)
}

export function fetchProject(id, options) {
  return apiRequest(`/api/projects/${id}`, options)
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
