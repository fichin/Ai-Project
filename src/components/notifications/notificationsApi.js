import { apiRequest } from '../../lib/apiClient'

// `options` is optional and forwarded as-is to apiRequest/fetch — pass
// `{ signal }` from an AbortController to make the request cancellable;
// every existing call site that omits it is unaffected.
export function fetchNotifications(limit = 50, options) {
  return apiRequest(`/api/notifications?limit=${limit}`, options)
}

export function fetchUnreadNotificationsCount(options) {
  return apiRequest('/api/notifications/unread-count', options)
}

export function markNotificationReadRequest(id) {
  return apiRequest(`/api/notifications/${id}/read`, { method: 'PATCH' })
}

export function markAllNotificationsReadRequest() {
  return apiRequest('/api/notifications/read-all', { method: 'PATCH' })
}
