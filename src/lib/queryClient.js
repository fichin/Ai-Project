import { QueryClient } from '@tanstack/react-query'
import { isAbortError } from './apiClient'

// A single app-wide QueryClient, provided once at the root (see App.jsx).
//
// No automatic retries is the deliberate default, not just TanStack's own:
// every query in this app (Projects, Agents, Dashboard, Notifications,
// Activity) pairs its data with a UI that already handles the failure case
// itself — either an explicit "Retry"/"Try again" button, or (for Activity)
// simply closing and reopening the panel. None of them want TanStack's
// automatic background retries silently delaying a *real* error (a 4xx/5xx
// response, a validation failure) from showing up, so that stays disabled.
//
// The one exception: apiClient throws a plain, status-less Error when
// `fetch` itself fails to reach the server at all (see its catch block) —
// which is exactly what a request racing Render's free-tier cold start
// looks like (the backend hasn't finished booting yet, so the connection
// is refused or times out). That specific case gets a couple of quick,
// backed-off retries; an aborted request (a newer query superseding this
// one) never gets retried, and neither does a real HTTP error response
// (identified by `error.status` being set) — those still fail immediately
// into their own explicit Retry UI, unchanged.
export function isColdStartFailure(error) {
  return !isAbortError(error) && typeof error?.status !== 'number'
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => isColdStartFailure(error) && failureCount < 2,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 4000),
    },
  },
})
