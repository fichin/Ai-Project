import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import Projects from './Projects'
import {
  fetchProjects,
  createProjectRequest,
  updateProjectRequest,
  deleteProjectRequest,
} from '../components/projects/projectsApi'

vi.mock('../components/projects/projectsApi')

const project = {
  id: 1,
  name: 'Alpha',
  description: 'First project',
  status: 'active',
  lastUpdated: 'Just now',
  agentCount: 0,
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

function renderProjects() {
  // A fresh QueryClient per test avoids cache bleed between tests — each
  // test gets its own isolated ['projects'] cache entry.
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <Projects />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('Projects — list query', () => {
  beforeEach(() => {
    fetchProjects.mockReset()
  })

  it('shows a loading state, then renders the fetched projects', async () => {
    const request = deferredRequest()
    fetchProjects.mockImplementation((options) => request.wrapped(options))

    renderProjects()

    expect(screen.getByText('Loading projects...')).toBeInTheDocument()

    request.resolve([project])

    await waitFor(() => expect(screen.getByText('Alpha')).toBeInTheDocument())
    expect(screen.queryByText('Loading projects...')).not.toBeInTheDocument()
  })

  it('passes an AbortSignal that is aborted when the component unmounts', async () => {
    const request = deferredRequest()
    fetchProjects.mockImplementation((options) => request.wrapped(options))

    const { unmount } = renderProjects()

    expect(fetchProjects).toHaveBeenCalledWith(expect.objectContaining({ signal: expect.any(AbortSignal) }))
    const { signal } = fetchProjects.mock.calls[0][0]
    expect(signal.aborted).toBe(false)

    unmount()

    expect(signal.aborted).toBe(true)
  })

  it('shows an error with a Retry button on failure, without retrying automatically', async () => {
    fetchProjects.mockRejectedValueOnce(new Error('Network down'))

    renderProjects()

    await waitFor(() => expect(screen.getByText('Network down')).toBeInTheDocument())
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument()
    expect(fetchProjects).toHaveBeenCalledTimes(1)
  })

  it('re-fetches and renders the list when Retry is clicked after a failure', async () => {
    fetchProjects.mockRejectedValueOnce(new Error('Network down'))
    renderProjects()
    await waitFor(() => expect(screen.getByText('Network down')).toBeInTheDocument())

    fetchProjects.mockResolvedValueOnce([project])
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }))

    await waitFor(() => expect(screen.getByText('Alpha')).toBeInTheDocument())
    expect(screen.queryByText('Network down')).not.toBeInTheDocument()
    expect(fetchProjects).toHaveBeenCalledTimes(2)
  })

  it('shows the empty state when the fetch resolves with no projects', async () => {
    fetchProjects.mockResolvedValueOnce([])

    renderProjects()

    await waitFor(() => expect(screen.getByText(/no projects found/i)).toBeInTheDocument())
  })
})

describe('Projects — mutations', () => {
  beforeEach(() => {
    fetchProjects.mockReset()
    createProjectRequest.mockReset()
    updateProjectRequest.mockReset()
    deleteProjectRequest.mockReset()
  })

  it('creates a project and adds it to the cached list without refetching', async () => {
    fetchProjects.mockResolvedValueOnce([project])
    renderProjects()
    await waitFor(() => expect(screen.getByText('Alpha')).toBeInTheDocument())

    fireEvent.click(screen.getByRole('button', { name: '+ New Project' }))

    const created = {
      id: 2,
      name: 'Beta',
      description: '',
      status: 'planning',
      lastUpdated: 'Just now',
      agentCount: 0,
    }
    createProjectRequest.mockResolvedValueOnce(created)

    fireEvent.change(screen.getByLabelText('Project name'), { target: { value: 'Beta' } })
    fireEvent.click(screen.getByRole('button', { name: 'Create Project' }))

    await waitFor(() => expect(screen.getByText('Beta')).toBeInTheDocument())
    expect(createProjectRequest).toHaveBeenCalledWith({ name: 'Beta', description: '', status: 'planning' })
    // The new project renders straight from the mutation's onSuccess cache
    // write — no extra list fetch was needed to pick it up.
    expect(fetchProjects).toHaveBeenCalledTimes(1)
    expect(screen.getByText('Alpha')).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('updates a project and reflects the change in the cached list', async () => {
    fetchProjects.mockResolvedValueOnce([project])
    renderProjects()
    await waitFor(() => expect(screen.getByText('Alpha')).toBeInTheDocument())

    fireEvent.click(screen.getByRole('button', { name: 'Edit Alpha' }))

    const updated = { ...project, name: 'Alpha Updated' }
    updateProjectRequest.mockResolvedValueOnce(updated)

    fireEvent.change(screen.getByLabelText('Project name'), { target: { value: 'Alpha Updated' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }))

    await waitFor(() => expect(screen.getByText('Alpha Updated')).toBeInTheDocument())
    expect(updateProjectRequest).toHaveBeenCalledWith(project.id, {
      name: 'Alpha Updated',
      description: project.description,
      status: project.status,
    })
    expect(fetchProjects).toHaveBeenCalledTimes(1)
    expect(screen.queryByText('Alpha')).not.toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('deletes a project and removes it from the cached list', async () => {
    fetchProjects.mockResolvedValueOnce([project])
    renderProjects()
    await waitFor(() => expect(screen.getByText('Alpha')).toBeInTheDocument())

    fireEvent.click(screen.getByRole('button', { name: 'Delete Alpha' }))
    expect(screen.getByText('Delete project')).toBeInTheDocument()

    deleteProjectRequest.mockResolvedValueOnce(null)
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }))

    await waitFor(() => expect(screen.queryByText('Alpha')).not.toBeInTheDocument())
    expect(deleteProjectRequest).toHaveBeenCalledWith(project.id)
    expect(fetchProjects).toHaveBeenCalledTimes(1)
    expect(screen.getByText(/no projects found/i)).toBeInTheDocument()
  })

  it('does not touch the cached list when a create mutation fails', async () => {
    fetchProjects.mockResolvedValueOnce([project])
    renderProjects()
    await waitFor(() => expect(screen.getByText('Alpha')).toBeInTheDocument())

    fireEvent.click(screen.getByRole('button', { name: '+ New Project' }))
    createProjectRequest.mockRejectedValueOnce(new Error('Name already taken.'))

    fireEvent.change(screen.getByLabelText('Project name'), { target: { value: 'Gamma' } })
    fireEvent.click(screen.getByRole('button', { name: 'Create Project' }))

    await waitFor(() => expect(screen.getByText('Name already taken.')).toBeInTheDocument())
    // The form stays open showing the error (same as the pre-mutation
    // behavior), and the failed create never reached the cache.
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.queryByText('Gamma')).not.toBeInTheDocument()
    expect(screen.getByText('Alpha')).toBeInTheDocument()
  })

  it('does not remove the item from the cached list when a delete mutation fails', async () => {
    fetchProjects.mockResolvedValueOnce([project])
    renderProjects()
    await waitFor(() => expect(screen.getByText('Alpha')).toBeInTheDocument())

    fireEvent.click(screen.getByRole('button', { name: 'Delete Alpha' }))
    deleteProjectRequest.mockRejectedValueOnce(new Error('Could not delete project.'))
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }))

    await waitFor(() => expect(screen.getByText('Could not delete project.')).toBeInTheDocument())
    // The confirm dialog stays open showing the error, and the project is
    // still in the list — the failed delete never touched the cache.
    expect(screen.getByText('Delete project')).toBeInTheDocument()
    expect(screen.getByText('Alpha')).toBeInTheDocument()
  })
})
