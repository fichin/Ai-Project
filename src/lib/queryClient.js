import { QueryClient } from '@tanstack/react-query'

// A single app-wide QueryClient, provided once at the root (see App.jsx).
//
// `retry: false` is a deliberate default, not just TanStack's own: every
// query in this app (Projects, Agents, Dashboard, Notifications, Activity)
// pairs its data with a UI that already handles the failure case itself —
// either an explicit "Retry"/"Try again" button, or (for Activity) simply
// closing and reopening the panel. None of them want TanStack's automatic
// background retries silently delaying that error from showing up, so this
// is centralized here instead of being repeated on every individual query.
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
})
