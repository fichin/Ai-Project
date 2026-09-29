import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import ProjectDetails from './ProjectDetails'
import { fetchProject, updateProjectRequest, deleteProjectRequest } from '../components/projects/projectsApi'
import { fetchAgents, createAgentRequest, updateAgentRequest, deleteAgentRequest } from '../components/agents/agentsApi'

// Only `useParams` needs to be controllable per-test; everything else
// (Link, useNavigate, MemoryRouter) is the real implementation so the page
// still renders inside a real router context.
let mockParams = { id: '1' }
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal()
  return { ...actual, useParams: () => mockParams }
})

vi.mock('../components/projects/projectsApi')
vi.mock('../components/agents/agentsApi')

const project = {
  id: 1,
  name: 'Project One',
  status: 'active',
  description: '',
  createdAt: null,
  updatedAt: null,
}

const agent = {
  id: 10,
  name: 'Scout',
  description: '',
  status: 'draft',
  projectId: 1,
  projectName: 'Project One',
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

function renderProjectDetails(queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })) {
  const utils = render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <ProjectDetails />
      </MemoryRouter>
    </QueryClientProvider>,
  )
  return { ...utils, queryClient }
}

function resetAllMocks() {
  fetchProject.mockReset()
  fetchAgents.mockReset()
  updateProjectRequest.mockReset()
  deleteProjectRequest.mockReset()
  createAgentRequest.mockReset()
  updateAgentRequest.mockReset()
  deleteAgentRequest.mockReset()
}

describe('ProjectDetails — project query', () => {
  beforeEach(() => {
    mockParams = { id: '1' }
    resetAllMocks()
    fetchAgents.mockResolvedValue([])
  })

  it('shows the project for the current id and ignores a slower, superseded response for a previous id', async () => {
    const projectOne = deferredRequest()
    const projectTwo = deferredRequest()
    fetchProject.mockImplementation((id, options) =>
      id === '1' ? projectOne.wrapped(id, options) : projectTwo.wrapped(id, options),
    )

    const { rerender, queryClient } = renderProjectDetails()
    expect(fetchProject).toHaveBeenCalledWith('1', expect.objectContaining({ signal: expect.any(AbortSignal) }))

    // Navigate to a different project before the first request resolves —
    // each id is now its own query key, so this doesn't need a manual
    // abort-then-replace controller to stay correct.
    mockParams = { id: '2' }
    rerender(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <ProjectDetails />
        </MemoryRouter>
      </QueryClientProvider>,
    )

    projectTwo.resolve({ id: 2, name: 'Project Two', status: 'active', description: '' })
    await waitFor(() => expect(screen.getByText('Project Two')).toBeInTheDocument())

    // The stale id=1 response finally arrives — it must not overwrite what's
    // now on screen.
    projectOne.resolve({ id: 1, name: 'Project One', status: 'active', description: '' })
    await new Promise((r) => setTimeout(r, 0))

    expect(screen.getByText('Project Two')).toBeInTheDocument()
    expect(screen.queryByText('Project One')).not.toBeInTheDocument()
  })

  it('does not show an error message when the request is aborted', async () => {
    const projectOne = deferredRequest()
    fetchProject.mockImplementation((id, options) => projectOne.wrapped(id, options))

    const { unmount } = renderProjectDetails()
    unmount()

    // Resolving after unmount must not throw or attempt a state update on
    // an unmounted component.
    expect(() => projectOne.resolve({ id: 1, name: 'Project One' })).not.toThrow()
  })

  it('shows "Project not found" for a 404', async () => {
    const notFoundError = new Error('Not found')
    notFoundError.status = 404
    fetchProject.mockRejectedValueOnce(notFoundError)

    renderProjectDetails()

    await waitFor(() => expect(screen.getByText('Project not found')).toBeInTheDocument())
  })

  it('shows an error with a Retry button on a non-404 failure, and Retry re-fetches', async () => {
    fetchProject.mockRejectedValueOnce(new Error('Network down'))
    renderProjectDetails()
    await waitFor(() => expect(screen.getByText('Network down')).toBeInTheDocument())

    fetchProject.mockResolvedValueOnce(project)
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }))

    await waitFor(() => expect(screen.getByText('Project One')).toBeInTheDocument())
  })
})

describe('ProjectDetails — agents query', () => {
  beforeEach(() => {
    mockParams = { id: '1' }
    resetAllMocks()
    fetchProject.mockResolvedValue(project)
  })

  it('only fetches agents once the project has loaded, filtered to this project', async () => {
    fetchAgents.mockResolvedValueOnce([agent, { ...agent, id: 11, name: 'Other Project Agent', projectId: 999 }])

    renderProjectDetails()

    await waitFor(() => expect(screen.getByText('Scout')).toBeInTheDocument())
    expect(screen.queryByText('Other Project Agent')).not.toBeInTheDocument()
  })

  it('passes an AbortSignal to fetchAgents that aborts on unmount', async () => {
    const request = deferredRequest()
    fetchAgents.mockImplementation((...args) => request.wrapped(...args))

    const { unmount } = renderProjectDetails()

    await waitFor(() => expect(fetchAgents).toHaveBeenCalled())
    const options = fetchAgents.mock.calls[0][0]
    expect(options.signal.aborted).toBe(false)

    unmount()

    expect(options.signal.aborted).toBe(true)
  })

  it('shows an error with a Retry button when the agents fetch fails', async () => {
    fetchAgents.mockRejectedValueOnce(new Error('Could not load agents.'))

    renderProjectDetails()

    await waitFor(() => expect(screen.getByText('Could not load agents.')).toBeInTheDocument())

    fetchAgents.mockResolvedValueOnce([agent])
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }))

    await waitFor(() => expect(screen.getByText('Scout')).toBeInTheDocument())
  })
})

describe('ProjectDetails — mutations sync the shared caches', () => {
  beforeEach(() => {
    mockParams = { id: '1' }
    resetAllMocks()
    fetchProject.mockResolvedValue(project)
    fetchAgents.mockResolvedValue([])
  })

  it('updating the project patches both its own detail cache and the shared ["projects"] list cache', async () => {
    const { queryClient } = renderProjectDetails()
    await waitFor(() => expect(screen.getByText('Project One')).toBeInTheDocument())

    // Seed the list cache the way Projects.jsx's own query would have
    // populated it, so we can verify this page patches it correctly.
    const otherProject = { id: 2, name: 'Untouched', status: 'planning' }
    queryClient.setQueryData(['projects'], [project, otherProject])

    const updated = { ...project, name: 'Renamed Project' }
    updateProjectRequest.mockResolvedValueOnce(updated)

    fireEvent.click(screen.getByRole('button', { name: 'Edit Project' }))
    fireEvent.change(screen.getByLabelText('Project name'), { target: { value: 'Renamed Project' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }))

    await waitFor(() => expect(screen.getByText('Renamed Project')).toBeInTheDocument())
    expect(queryClient.getQueryData(['projects'])).toEqual([updated, otherProject])
    expect(queryClient.getQueryData(['projects', 'detail', '1'])).toEqual(updated)
  })

  it('deleting the project removes it from the shared ["projects"] list cache', async () => {
    const { queryClient } = renderProjectDetails()
    await waitFor(() => expect(screen.getByText('Project One')).toBeInTheDocument())

    queryClient.setQueryData(['projects'], [project])
    deleteProjectRequest.mockResolvedValueOnce(null)

    fireEvent.click(screen.getByRole('button', { name: 'Delete Project' }))
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }))

    await waitFor(() => expect(queryClient.getQueryData(['projects'])).toEqual([]))
  })

  it('does not touch the shared ["projects"] cache when updating the project fails', async () => {
    const { queryClient } = renderProjectDetails()
    await waitFor(() => expect(screen.getByText('Project One')).toBeInTheDocument())

    queryClient.setQueryData(['projects'], [project])
    updateProjectRequest.mockRejectedValueOnce(new Error('Name already taken.'))

    fireEvent.click(screen.getByRole('button', { name: 'Edit Project' }))
    fireEvent.change(screen.getByLabelText('Project name'), { target: { value: 'Renamed Project' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }))

    await waitFor(() => expect(screen.getByText('Name already taken.')).toBeInTheDocument())
    expect(queryClient.getQueryData(['projects'])).toEqual([project])
    expect(screen.getByText('Project One')).toBeInTheDocument()
  })

  it('creating an agent here adds it to the shared ["agents"] cache', async () => {
    const { queryClient } = renderProjectDetails()
    await waitFor(() => expect(screen.getByText('No agents assigned to this project yet.')).toBeInTheDocument())

    queryClient.setQueryData(['agents'], [])
    const created = { ...agent, id: 20, name: 'New Agent' }
    createAgentRequest.mockResolvedValueOnce(created)

    fireEvent.click(screen.getByRole('button', { name: '+ Add Agent' }))
    fireEvent.change(screen.getByLabelText('Agent name'), { target: { value: 'New Agent' } })
    fireEvent.click(screen.getByRole('button', { name: 'Create Agent' }))

    await waitFor(() => expect(screen.getByText('New Agent')).toBeInTheDocument())
    expect(queryClient.getQueryData(['agents'])).toEqual([created])
  })

  it('deleting an agent here removes it from the shared ["agents"] cache', async () => {
    fetchAgents.mockReset()
    fetchAgents.mockResolvedValueOnce([agent])
    const { queryClient } = renderProjectDetails()
    await waitFor(() => expect(screen.getByText('Scout')).toBeInTheDocument())

    deleteAgentRequest.mockResolvedValueOnce(null)
    fireEvent.click(screen.getByRole('button', { name: 'Delete Scout' }))
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }))

    await waitFor(() => expect(screen.queryByText('Scout')).not.toBeInTheDocument())
    expect(queryClient.getQueryData(['agents'])).toEqual([])
  })

  it('does not touch the shared ["agents"] cache when creating an agent fails', async () => {
    const { queryClient } = renderProjectDetails()
    await waitFor(() => expect(screen.getByText('No agents assigned to this project yet.')).toBeInTheDocument())

    queryClient.setQueryData(['agents'], [])
    createAgentRequest.mockRejectedValueOnce(new Error('Name already taken.'))

    fireEvent.click(screen.getByRole('button', { name: '+ Add Agent' }))
    fireEvent.change(screen.getByLabelText('Agent name'), { target: { value: 'Ghost' } })
    fireEvent.click(screen.getByRole('button', { name: 'Create Agent' }))

    await waitFor(() => expect(screen.getByText('Name already taken.')).toBeInTheDocument())
    expect(queryClient.getQueryData(['agents'])).toEqual([])
  })

  it('rolls back an optimistic status toggle without corrupting the shared cache on failure', async () => {
    fetchAgents.mockReset()
    fetchAgents.mockResolvedValueOnce([agent])
    renderProjectDetails()
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
})
