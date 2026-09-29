import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import NotificationsBell from './NotificationsBell'
import {
  fetchNotifications,
  fetchUnreadNotificationsCount,
  markNotificationReadRequest,
  markAllNotificationsReadRequest,
} from './notificationsApi'

vi.mock('./notificationsApi')

const notification = {
  id: 1,
  type: 'project_created',
  message: 'Project "Launch" was created',
  relativeTime: '2m ago',
  isRead: false,
  entityType: 'project',
  entityId: 42,
  entityName: null,
}

// Mimics real fetch: resolves/rejects like a plain promise, but also rejects
// with an AbortError the instant its signal is aborted — exactly what
// TanStack Query does when it cancels an in-flight queryFn (e.g. when the
// dropdown closes and its query becomes disabled, or on unmount).
function deferredRequest() {
  let resolve
  const inner = new Promise((res) => {
    resolve = res
  })
  const wrapped = (...args) => {
    const options = args[args.length - 1]
    return new Promise((res, rej) => {
      options?.signal?.addEventListener('abort', () => {
        const error = new Error('The operation was aborted.')
        error.name = 'AbortError'
        rej(error)
      })
      inner.then(res)
    })
  }
  return { resolve, wrapped }
}

function renderBell() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <NotificationsBell />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

function openBell() {
  fireEvent.click(screen.getByRole('button', { name: /notifications/i }))
}

describe('NotificationsBell — unread count query', () => {
  beforeEach(() => {
    fetchNotifications.mockReset()
    fetchUnreadNotificationsCount.mockReset()
    markNotificationReadRequest.mockReset()
    markAllNotificationsReadRequest.mockReset()
  })

  it('fetches the unread count on mount and shows it as a badge', async () => {
    fetchUnreadNotificationsCount.mockResolvedValue({ count: 3 })

    renderBell()

    await waitFor(() => expect(screen.getByText('3')).toBeInTheDocument())
    expect(screen.getByRole('button', { name: 'Open notifications, 3 unread' })).toBeInTheDocument()
  })

  it('shows no badge when the unread count is zero', async () => {
    fetchUnreadNotificationsCount.mockResolvedValue({ count: 0 })

    renderBell()

    await waitFor(() => expect(fetchUnreadNotificationsCount).toHaveBeenCalled())
    expect(screen.getByRole('button', { name: 'Open notifications' })).toBeInTheDocument()
  })

  it('polls the unread count every 30 seconds and updates the badge', async () => {
    vi.useFakeTimers()
    try {
      fetchUnreadNotificationsCount.mockResolvedValueOnce({ count: 1 })
      renderBell()

      await vi.waitFor(() => expect(fetchUnreadNotificationsCount).toHaveBeenCalledTimes(1))

      fetchUnreadNotificationsCount.mockResolvedValueOnce({ count: 5 })
      await vi.advanceTimersByTimeAsync(30000)

      expect(fetchUnreadNotificationsCount).toHaveBeenCalledTimes(2)
      await vi.waitFor(() => expect(screen.getByText('5')).toBeInTheDocument())
    } finally {
      vi.useRealTimers()
    }
  })

  it('passes an AbortSignal to fetchUnreadNotificationsCount that aborts on unmount', async () => {
    const request = deferredRequest()
    fetchUnreadNotificationsCount.mockImplementation((options) => request.wrapped(options))

    const { unmount } = renderBell()

    expect(fetchUnreadNotificationsCount).toHaveBeenCalledWith(
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    )
    const { signal } = fetchUnreadNotificationsCount.mock.calls[0][0]
    expect(signal.aborted).toBe(false)

    unmount()

    expect(signal.aborted).toBe(true)
  })
})

describe('NotificationsBell — list query', () => {
  beforeEach(() => {
    fetchNotifications.mockReset()
    fetchUnreadNotificationsCount.mockReset()
    fetchUnreadNotificationsCount.mockResolvedValue({ count: 1 })
    markNotificationReadRequest.mockReset()
    markAllNotificationsReadRequest.mockReset()
  })

  it('only fetches the list once the dropdown is opened', async () => {
    fetchNotifications.mockResolvedValue([notification])
    renderBell()

    await waitFor(() => expect(fetchUnreadNotificationsCount).toHaveBeenCalled())
    expect(fetchNotifications).not.toHaveBeenCalled()

    openBell()

    await waitFor(() => expect(fetchNotifications).toHaveBeenCalledTimes(1))
    await waitFor(() => expect(screen.getByText(notification.message)).toBeInTheDocument())
  })

  it('shows loading skeletons, then renders the fetched notifications', async () => {
    const request = deferredRequest()
    fetchNotifications.mockImplementation((...args) => request.wrapped(...args))

    renderBell()
    openBell()

    expect(screen.queryByText(notification.message)).not.toBeInTheDocument()
    expect(screen.queryByText(/all caught up/i)).not.toBeInTheDocument()

    request.resolve([notification])

    await waitFor(() => expect(screen.getByText(notification.message)).toBeInTheDocument())
  })

  it('shows an error with a Try again button on failure, without retrying automatically', async () => {
    fetchNotifications.mockRejectedValueOnce(new Error('Could not load notifications.'))
    renderBell()
    openBell()

    await waitFor(() => expect(screen.getByText('Could not load notifications.')).toBeInTheDocument())
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument()
    expect(fetchNotifications).toHaveBeenCalledTimes(1)
  })

  it('re-fetches and renders the list when Try again is clicked after a failure', async () => {
    fetchNotifications.mockRejectedValueOnce(new Error('Could not load notifications.'))
    renderBell()
    openBell()
    await waitFor(() => expect(screen.getByText('Could not load notifications.')).toBeInTheDocument())

    fetchNotifications.mockResolvedValueOnce([notification])
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }))

    await waitFor(() => expect(screen.getByText(notification.message)).toBeInTheDocument())
    expect(fetchNotifications).toHaveBeenCalledTimes(2)
  })

  it('passes an AbortSignal to fetchNotifications that aborts when the component unmounts', async () => {
    const request = deferredRequest()
    fetchNotifications.mockImplementation((...args) => request.wrapped(...args))

    const { unmount } = renderBell()
    openBell()

    await waitFor(() => expect(fetchNotifications).toHaveBeenCalled())
    const options = fetchNotifications.mock.calls[0][1]
    expect(options.signal.aborted).toBe(false)

    unmount()

    expect(options.signal.aborted).toBe(true)
  })
})

describe('NotificationsBell — mutations', () => {
  beforeEach(() => {
    fetchNotifications.mockReset()
    fetchUnreadNotificationsCount.mockReset()
    fetchUnreadNotificationsCount.mockResolvedValue({ count: 1 })
    fetchNotifications.mockResolvedValue([notification])
    markNotificationReadRequest.mockReset()
    markAllNotificationsReadRequest.mockReset()
  })

  it('marks a notification as read optimistically and keeps it once the request succeeds', async () => {
    renderBell()
    openBell()
    await waitFor(() => expect(screen.getByText(notification.message)).toBeInTheDocument())

    let resolveMarkRead
    markNotificationReadRequest.mockImplementation(
      () =>
        new Promise((res) => {
          resolveMarkRead = res
        }),
    )

    fireEvent.click(screen.getByRole('button', { name: new RegExp(notification.message) }))

    // Optimistic: the badge drops immediately, before the request settles.
    await waitFor(() => expect(screen.getByRole('button', { name: 'Open notifications' })).toBeInTheDocument())
    expect(markNotificationReadRequest).toHaveBeenCalledWith(notification.id)

    resolveMarkRead(null)
    await waitFor(() => expect(screen.getByRole('button', { name: 'Open notifications' })).toBeInTheDocument())
  })

  it('re-syncs from the server (not a guessed rollback) when mark-as-read fails', async () => {
    renderBell()
    openBell()
    await waitFor(() => expect(screen.getByText(notification.message)).toBeInTheDocument())
    expect(fetchUnreadNotificationsCount).toHaveBeenCalledTimes(1)

    markNotificationReadRequest.mockRejectedValueOnce(new Error('Could not update notification.'))
    // Clicking a row always marks-as-read *and* closes the dropdown
    // (it also navigates) — same as before the migration.
    fireEvent.click(screen.getByRole('button', { name: new RegExp(notification.message) }))

    // The unread-count query is always active (not gated by the dropdown),
    // so its re-sync fires immediately in the background.
    await waitFor(() => expect(fetchUnreadNotificationsCount).toHaveBeenCalledTimes(2))

    // The list query is only active while the dropdown is open, so its
    // invalidated cache re-fetches the next time it's reopened rather than
    // in the background while nothing is displaying it — same eventual
    // truth, without a wasted request while the dropdown is closed.
    fetchNotifications.mockResolvedValueOnce([notification])
    openBell()
    await waitFor(() => expect(fetchNotifications).toHaveBeenCalledTimes(2))
  })

  it('marks all as read optimistically and clears the badge on success', async () => {
    markAllNotificationsReadRequest.mockResolvedValueOnce(null)
    renderBell()
    openBell()
    await waitFor(() => expect(screen.getByText(notification.message)).toBeInTheDocument())

    fireEvent.click(screen.getByRole('button', { name: 'Mark all as read' }))

    await waitFor(() => expect(screen.getByRole('button', { name: 'Open notifications' })).toBeInTheDocument())
    expect(markAllNotificationsReadRequest).toHaveBeenCalledTimes(1)
  })

  it('rolls back mark-all-read and shows an error when the request fails, without corrupting the cache', async () => {
    renderBell()
    openBell()
    await waitFor(() => expect(screen.getByText(notification.message)).toBeInTheDocument())
    expect(screen.getByRole('button', { name: 'Open notifications, 1 unread' })).toBeInTheDocument()

    markAllNotificationsReadRequest.mockRejectedValueOnce(new Error('Could not update notifications.'))
    fireEvent.click(screen.getByRole('button', { name: 'Mark all as read' }))

    await waitFor(() => expect(screen.getByText('Could not update notifications.')).toBeInTheDocument())
    // Rolled back to the exact previous state — badge count is restored.
    expect(screen.getByRole('button', { name: 'Open notifications, 1 unread' })).toBeInTheDocument()
  })
})
