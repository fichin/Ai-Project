import { apiRequest } from '../../lib/apiClient'

// `options` is optional and forwarded as-is to apiRequest/fetch — pass
// `{ signal }` from an AbortController to make the request cancellable;
// the existing no-argument call site is unaffected.
export function fetchActivity(limit = 50, options) {
  return apiRequest(`/api/activity?limit=${limit}`, options)
}
