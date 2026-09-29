import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import Agents from './Agents'
import {
  fetchAgents,
  createAgentRequest,
  updateAgentRequest,
  deleteAgentRequest,
} from '../components/agents/agentsApi'
import { fetchProjects } from '../components/projects/projectsApi'

vi.mock('../components/agents/agentsApi')
vi.mock('../components/projects/projectsApi')

const agent = {
  id: 1,
  name: 'Scout',
  description: 'Research agent',
  status: 'draft',
  projectId: null,
  projectName: null,
  lastUpdated: 'Just now',
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

function renderAgents() {
  // A fresh QueryClient per test avoids cache bleed between tests — each
  // test gets its own isolated ['agents']/['projects'] cache entries.
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <Agents />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('Agents — list query', () => {
  beforeEach(() => {
    fetchAgents.mockReset()
    fetchProjects.mockReset()
    fetchProjects.mockResolvedValue([])
  })

  it('shows a loading state, then renders the fetched agents', async () => {
    const request = deferredRequest()
    fetchAgents.mockImplementation((options) => request.wrapped(options))

    renderAgents()

    expect(screen.getByText('Loading agents...')).toBeInTheDocument()

    request.resolve([agent])

    await waitFor(() => expect(screen.getByText('Scout')).toBeInTheDocument())
    expect(screen.queryByText('Loading agents...')).not.toBeInTheDocument()
  })

  it('passes an AbortSignal to fetchAgents that is aborted when the component unmounts', async () => {
    const request = deferredRequest()
    fetchAgents.mockImplementation((options) => request.wrapped(options))

    const { unmount } = renderAgents()

    expect(fetchAgents).toHaveBeenCalledWith(expect.objectContaining({ signal: expect.any(AbortSignal) }))
    const { signal } = fetchAgents.mock.calls[0][0]
    expect(signal.aborted).toBe(false)

    unmount()

    expect(signal.aborted).toBe(true)
  })

  it('passes an AbortSignal to fetchProjects that is aborted when the component unmounts', async () => {
    fetchAgents.mockResolvedValueOnce([])
    const request = deferredRequest()
    fetchProjects.mockReset()
    fetchProjects.mockImplementation((options) => request.wrapped(options))

    const { unmount } = renderAgents()

    expect(fetchProjects).toHaveBeenCalledWith(expect.objectContaining({ signal: expect.any(AbortSignal) }))
    const { signal } = fetchProjects.mock.calls[0][0]
    expect(signal.aborted).toBe(false)

    unmount()

    expect(signal.aborted).toBe(true)
  })

  it('shows an error with a Retry button when the agents fetch fails, without retrying automatically', async () => {
    fetchAgents.mockRejectedValueOnce(new Error('Network down'))

    renderAgents()

    await waitFor(() => expect(screen.getByText('Network down')).toBeInTheDocument())
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument()
    expect(fetchAgents).toHaveBeenCalledTimes(1)
  })

  it('re-fetches and renders the list when Retry is clicked after a failure', async () => {
    fetchAgents.mockRejectedValueOnce(new Error('Network down'))
    renderAgents()
    await waitFor(() => expect(screen.getByText('Network down')).toBeInTheDocument())

    fetchAgents.mockResolvedValueOnce([agent])
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }))

    await waitFor(() => expect(screen.getByText('Scout')).toBeInTheDocument())
    expect(screen.queryByText('Network down')).not.toBeInTheDocument()
    expect(fetchAgents).toHaveBeenCalledTimes(2)
  })

  it('shows the empty state when the fetch resolves with no agents', async () => {
    fetchAgents.mockResolvedValueOnce([])

    renderAgents()

    await waitFor(() => expect(screen.getByText('No agents yet')).toBeInTheDocument())
  })
})

describe('Agents — mutations', () => {
  beforeEach(() => {
    fetchAgents.mockReset()
    fetchProjects.mockReset()
    fetchProjects.mockResolvedValue([])
    createAgentRequest.mockReset()
    updateAgentRequest.mockReset()
    deleteAgentRequest.mockReset()
  })

  it('creates an agent and adds it to the cached list without refetching', async () => {
    fetchAgents.mockResolvedValueOnce([agent])
    renderAgents()
    await waitFor(() => expect(screen.getByText('Scout')).toBeInTheDocument())

    fireEvent.click(screen.getByRole('button', { name: '+ Create Agent' }))

    const created = {
      id: 2,
      name: 'Helper',
      description: '',
      status: 'draft',
      projectId: null,
      projectName: null,
      lastUpdated: 'Just now',
    }
    createAgentRequest.mockResolvedValueOnce(created)

    fireEvent.change(screen.getByLabelText('Agent name'), { target: { value: 'Helper' } })
    fireEvent.click(screen.getByRole('button', { name: 'Create Agent' }))

    await waitFor(() => expect(screen.getByText('Helper')).toBeInTheDocument())
    expect(createAgentRequest).toHaveBeenCalledWith({
      name: 'Helper',
      description: '',
      status: 'draft',
      project_id: null,
    })
    // The new agent renders straight from the mutation's onSuccess cache
    // write — no extra list fetch was needed to pick it up.
    expect(fetchAgents).toHaveBeenCalledTimes(1)
    expect(screen.getByText('Scout')).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('updates an agent and reflects the change in the cached list', async () => {
    fetchAgents.mockResolvedValueOnce([agent])
    renderAgents()
    await waitFor(() => expect(screen.getByText('Scout')).toBeInTheDocument())

    fireEvent.click(screen.getByRole('button', { name: 'Edit Scout' }))

    const updated = { ...agent, name: 'Scout Updated' }
    updateAgentRequest.mockResolvedValueOnce(updated)

    fireEvent.change(screen.getByLabelText('Agent name'), { target: { value: 'Scout Updated' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }))

    await waitFor(() => expect(screen.getByText('Scout Updated')).toBeInTheDocument())
    expect(updateAgentRequest).toHaveBeenCalledWith(agent.id, {
      name: 'Scout Updated',
      description: agent.description,
      status: agent.status,
      project_id: null,
    })
    expect(fetchAgents).toHaveBeenCalledTimes(1)
    expect(screen.queryByText('Scout')).not.toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('deletes an agent and removes it from the cached list', async () => {
    fetchAgents.mockResolvedValueOnce([agent])
    renderAgents()
    await waitFor(() => expect(screen.getByText('Scout')).toBeInTheDocument())

    fireEvent.click(screen.getByRole('button', { name: 'Delete Scout' }))
    expect(screen.getByText('Delete agent')).toBeInTheDocument()

    deleteAgentRequest.mockResolvedValueOnce(null)
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }))

    await waitFor(() => expect(screen.queryByText('Scout')).not.toBeInTheDocument())
    expect(deleteAgentRequest).toHaveBeenCalledWith(agent.id)
    expect(fetchAgents).toHaveBeenCalledTimes(1)
    expect(screen.getByText('No agents yet')).toBeInTheDocument()
  })

  it('optimistically toggles status and confirms it with the server response', async () => {
    fetchAgents.mockResolvedValueOnce([agent])
    renderAgents()
    await waitFor(() => expect(screen.getByText('Scout')).toBeInTheDocument())

    let resolveUpdate
    updateAgentRequest.mockImplementation(
      () =>
        new Promise((res) => {
          resolveUpdate = res
        }),
    )

    fireEvent.click(screen.getByRole('button', { name: 'Activate' }))

    // The card flips to "active" (Pause) immediately, before the request
    // resolves — this is the pre-existing optimistic behavior.
    await waitFor(() => expect(screen.getByRole('button', { name: 'Pause' })).toBeInTheDocument())
    expect(updateAgentRequest).toHaveBeenCalledWith(agent.id, { status: 'active' })

    resolveUpdate({ ...agent, status: 'active' })
    await waitFor(() => expect(screen.getByRole('button', { name: 'Pause' })).toBeInTheDocument())
  })

  it('rolls back an optimistic status toggle and shows an error when the request fails', async () => {
    fetchAgents.mockResolvedValueOnce([agent])
    renderAgents()
    await waitFor(() => expect(screen.getByText('Scout')).toBeInTheDocument())

    let rejectUpdate
    updateAgentRequest.mockImplementation(
      () =>
        new Promise((_res, rej) => {
          rejectUpdate = rej
        }),
    )

    fireEvent.click(screen.getByRole('button', { name: 'Activate' }))

    // Optimistic flip happens first, before the request settles...
    await waitFor(() => expect(screen.getByRole('button', { name: 'Pause' })).toBeInTheDocument())

    rejectUpdate(new Error('Could not update agent.'))

    // ...then rolls back once the request rejects.
    await waitFor(() => expect(screen.getByRole('button', { name: 'Activate' })).toBeInTheDocument())
    expect(screen.getByText('Could not update agent.')).toBeInTheDocument()
  })

  it('does not touch the cached list when a create mutation fails', async () => {
    fetchAgents.mockResolvedValueOnce([agent])
    renderAgents()
    await waitFor(() => expect(screen.getByText('Scout')).toBeInTheDocument())

    fireEvent.click(screen.getByRole('button', { name: '+ Create Agent' }))
    createAgentRequest.mockRejectedValueOnce(new Error('Name already taken.'))

    fireEvent.change(screen.getByLabelText('Agent name'), { target: { value: 'Ghost' } })
    fireEvent.click(screen.getByRole('button', { name: 'Create Agent' }))

    await waitFor(() => expect(screen.getByText('Name already taken.')).toBeInTheDocument())
    // The form stays open showing the error, and the failed create never
    // reached the cache.
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.queryByText('Ghost')).not.toBeInTheDocument()
    expect(screen.getByText('Scout')).toBeInTheDocument()
  })

  it('does not remove the item from the cached list when a delete mutation fails', async () => {
    fetchAgents.mockResolvedValueOnce([agent])
    renderAgents()
    await waitFor(() => expect(screen.getByText('Scout')).toBeInTheDocument())

    fireEvent.click(screen.getByRole('button', { name: 'Delete Scout' }))
    deleteAgentRequest.mockRejectedValueOnce(new Error('Could not delete agent.'))
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }))

    await waitFor(() => expect(screen.getByText('Could not delete agent.')).toBeInTheDocument())
    // The confirm dialog stays open showing the error, and the agent is
    // still in the list — the failed delete never touched the cache.
    expect(screen.getByText('Delete agent')).toBeInTheDocument()
    expect(screen.getByText('Scout')).toBeInTheDocument()
  })
})
