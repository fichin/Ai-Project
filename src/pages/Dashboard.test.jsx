import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import Dashboard from './Dashboard'
import { fetchDashboardSummary } from '../components/dashboard/dashboardApi'
import { useAuth } from '../context/useAuth'

vi.mock('../components/dashboard/dashboardApi')
vi.mock('../context/useAuth')

const summary = {
  stats: {
    conversations: { total: 11, trendPct: 5, last7Days: 3 },
    projects: { active: 2, total: 4 },
    agents: { total: 3, active: 1 },
    messages: { total: 44, trendPct: -2, last7Days: 10 },
  },
  usage: [],
  recentProjects: [],
  agentActivity: [],
  recentActivity: [],
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
  const wrapped = (options) =>
    new Promise((res, rej) => {
      options?.signal?.addEventListener('abort', () => {
        const error = new Error('The operation was aborted.')
        error.name = 'AbortError'
        rej(error)
      })
      inner.then(res)
    })
  return { resolve, wrapped }
}

function renderDashboard() {
  // A fresh QueryClient per test avoids cache bleed between tests — each
  // test gets its own isolated ['dashboard', 'summary'] cache entry.
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('Dashboard — summary query', () => {
  beforeEach(() => {
    fetchDashboardSummary.mockReset()
    useAuth.mockReturnValue({ user: { name: 'Ada Lovelace' } })
  })

  it('shows loading skeletons, then renders the fetched summary', async () => {
    const request = deferredRequest()
    fetchDashboardSummary.mockImplementation((options) => request.wrapped(options))

    renderDashboard()

    expect(screen.getByText('Welcome back, Ada 👋')).toBeInTheDocument()
    // StatCard hides its "secondary" line entirely while loading.
    expect(screen.queryByText('3 in the last 7 days')).not.toBeInTheDocument()

    request.resolve(summary)

    await waitFor(() => expect(screen.getByText('11')).toBeInTheDocument())
    expect(screen.getByText('3 in the last 7 days')).toBeInTheDocument()
    expect(screen.getByText('44')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
  })

  it('passes an AbortSignal that is aborted when the component unmounts', async () => {
    const request = deferredRequest()
    fetchDashboardSummary.mockImplementation((options) => request.wrapped(options))

    const { unmount } = renderDashboard()

    expect(fetchDashboardSummary).toHaveBeenCalledWith(expect.objectContaining({ signal: expect.any(AbortSignal) }))
    const { signal } = fetchDashboardSummary.mock.calls[0][0]
    expect(signal.aborted).toBe(false)

    unmount()

    expect(signal.aborted).toBe(true)
  })

  it('shows an error with a Retry button on failure, without retrying automatically', async () => {
    fetchDashboardSummary.mockRejectedValueOnce(new Error('Network down'))

    renderDashboard()

    await waitFor(() => expect(screen.getByText('Network down')).toBeInTheDocument())
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument()
    expect(fetchDashboardSummary).toHaveBeenCalledTimes(1)
    // The stats grid isn't rendered at all while the error view is shown —
    // same as the original hand-rolled `error ? ... : ...` branch.
    expect(screen.queryByText('AI Conversations')).not.toBeInTheDocument()
  })

  it('re-fetches and renders the summary when Retry is clicked after a failure', async () => {
    fetchDashboardSummary.mockRejectedValueOnce(new Error('Network down'))
    renderDashboard()
    await waitFor(() => expect(screen.getByText('Network down')).toBeInTheDocument())

    const request = deferredRequest()
    fetchDashboardSummary.mockImplementation((options) => request.wrapped(options))
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }))

    // The error view is replaced by the stats grid (now loading) for the
    // duration of the retry, rather than staying on screen until it
    // settles — matching the original loader's synchronous `setError(null)`.
    await waitFor(() => expect(screen.queryByText('Network down')).not.toBeInTheDocument())
    expect(screen.getByText('AI Conversations')).toBeInTheDocument()

    request.resolve(summary)

    await waitFor(() => expect(screen.getByText('11')).toBeInTheDocument())
    expect(fetchDashboardSummary).toHaveBeenCalledTimes(2)
  })
})
