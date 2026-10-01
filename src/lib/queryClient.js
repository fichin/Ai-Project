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
// Two narrow exceptions, both still read-only/idempotent and still bounded:
//
// 1. apiClient throws a plain, status-less Error when `fetch` itself fails
//    to reach the server at all (see its catch block) — which is exactly
//    what a request racing Render's free-tier cold start looks like (the
//    backend hasn't finished booting yet, so the connection is refused or
//    times out). That gets a couple of quick, backed-off retries.
//
// 2. A 401 ("Authentication required.") can be a transient race rather
//    than a genuinely missing/expired session — e.g. mobile Safari has a
//    documented history of occasionally not attaching a cross-site session
//    cookie to one of several concurrent credentialed fetches fired on a
//    page's initial load (every protected page fires several at once:
//    auth check, notifications poll, preferences, the page's own data),
//    even though the identical request would succeed a moment later. A
//    single retry is enough to tell a real logged-out session (still 401s,
//    shows the same Retry UI as before) apart from that race (silently
//    recovers) — since every query here is a GET, retrying is always safe.
//
// An aborted request (a newer query superseding this one) never gets
// retried, and neither does any other real HTTP error response — those
// still fail immediately into their own explicit Retry UI, unchanged.
export function isColdStartFailure(error) {
  return !isAbortError(error) && typeof error?.status !== 'number'
}

export function isUnauthorized(error) {
  return error?.status === 401
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        if (isUnauthorized(error)) return failureCount < 1
        return isColdStartFailure(error) && failureCount < 2
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 4000),
    },
  },
})
