import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import ActivityDrawer from './ActivityDrawer'
import { fetchActivity } from './activityApi'

vi.mock('./activityApi')

const activityItem = {
  id: 1,
  type: 'project_created',
  message: 'Project "Launch" was created',
  relativeTime: '2m ago',
}

// Mimics real fetch: resolves/rejects like a plain promise, but also rejects
// with an AbortError the instant its signal is aborted — exactly what
// TanStack Query does when it cancels an in-flight queryFn (e.g. on
// unmount).
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

function renderDrawer(isOpen, onClose = () => {}) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const utils = render(
    <QueryClientProvider client={queryClient}>
      <ActivityDrawer isOpen={isOpen} onClose={onClose} />
    </QueryClientProvider>,
  )
  return { ...utils, queryClient }
}

describe('ActivityDrawer — activity query', () => {
  beforeEach(() => {
    fetchActivity.mockReset()
  })

  it('does not fetch while closed', () => {
    fetchActivity.mockResolvedValue([])
    renderDrawer(false)

    expect(fetchActivity).not.toHaveBeenCalled()
  })

  it('shows loading skeletons, then renders the fetched activity', async () => {
    const request = deferredRequest()
    fetchActivity.mockImplementation((...args) => request.wrapped(...args))

    renderDrawer(true)

    expect(screen.queryByText(activityItem.message)).not.toBeInTheDocument()
    expect(screen.queryByText(/no activity yet/i)).not.toBeInTheDocument()

    request.resolve([activityItem])

    await waitFor(() => expect(screen.getByText(activityItem.message)).toBeInTheDocument())
    expect(screen.getByText(activityItem.relativeTime)).toBeInTheDocument()
  })

  it('shows the empty state when the fetch resolves with no activity', async () => {
    fetchActivity.mockResolvedValueOnce([])

    renderDrawer(true)

    await waitFor(() => expect(screen.getByText(/no activity yet/i)).toBeInTheDocument())
  })

  it('shows an error message on failure, with no automatic retry', async () => {
    fetchActivity.mockRejectedValueOnce(new Error('Could not load activity.'))

    renderDrawer(true)

    await waitFor(() => expect(screen.getByText('Could not load activity.')).toBeInTheDocument())
    expect(fetchActivity).toHaveBeenCalledTimes(1)
    // There has never been a Retry button here — closing and reopening the
    // drawer is the only way to try again.
    expect(screen.queryByRole('button', { name: /retry|try again/i })).not.toBeInTheDocument()
  })

  it('re-fetches and recovers when the drawer is closed and reopened after a failure', async () => {
    fetchActivity.mockRejectedValueOnce(new Error('Could not load activity.'))
    const { rerender, queryClient } = renderDrawer(true)
    await waitFor(() => expect(screen.getByText('Could not load activity.')).toBeInTheDocument())

    fetchActivity.mockResolvedValueOnce([activityItem])

    // Closing then reopening is this drawer's only "retry" affordance —
    // AppShell always keeps the same component instance mounted, just
    // toggling its `isOpen` prop, so re-rendering against the same
    // QueryClient mirrors the stale cache being refetched on reopen.
    rerender(
      <QueryClientProvider client={queryClient}>
        <ActivityDrawer isOpen={false} onClose={() => {}} />
      </QueryClientProvider>,
    )
    rerender(
      <QueryClientProvider client={queryClient}>
        <ActivityDrawer isOpen onClose={() => {}} />
      </QueryClientProvider>,
    )

    await waitFor(() => expect(screen.getByText(activityItem.message)).toBeInTheDocument())
    expect(fetchActivity).toHaveBeenCalledTimes(2)
  })

  it('passes an AbortSignal to fetchActivity that is aborted when the component unmounts', async () => {
    const request = deferredRequest()
    fetchActivity.mockImplementation((...args) => request.wrapped(...args))

    const { unmount } = renderDrawer(true)

    await waitFor(() => expect(fetchActivity).toHaveBeenCalled())
    const options = fetchActivity.mock.calls[0][1]
    expect(options.signal.aborted).toBe(false)

    unmount()

    expect(options.signal.aborted).toBe(true)
  })
})
