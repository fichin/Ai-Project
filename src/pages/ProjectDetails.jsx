import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import Button from '../components/Button'
import ConfirmDialog from '../components/ConfirmDialog'
import ProjectFormModal from '../components/projects/ProjectFormModal'
import AgentCard from '../components/agents/AgentCard'
import AgentFormModal from '../components/agents/AgentFormModal'
import { nextStatus } from '../components/agents/agentsData'
import { STATUS_LABELS } from '../components/projects/projectsData'
import { fetchProject, updateProjectRequest, deleteProjectRequest } from '../components/projects/projectsApi'
import { fetchAgents, createAgentRequest, updateAgentRequest, deleteAgentRequest } from '../components/agents/agentsApi'
import './ProjectDetails.css'

// The list key Projects.jsx and Agents.jsx already read/write — reusing it
// here (rather than a page-local cache) is what keeps an agent or project
// change made from this page visible on those pages without a manual
// reload, and vice versa.
const PROJECTS_LIST_KEY = ['projects']
const AGENTS_QUERY_KEY = ['agents']

// SQLite's datetime('now') returns UTC timestamps like "2026-09-08 14:06:39"
// (no offset) — same convention already relied on server-side.
function formatDate(value) {
  if (!value) return null
  const date = new Date(`${value.replace(' ', 'T')}Z`)
  return date.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
}

function ProjectDetails() {
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  // A single project's detail is its own query — distinct from the
  // `['projects']` list (a different shape: one object, not an array) —
  // but keyed by `id` so navigating between two projects' detail pages
  // fetches/caches each independently, and a slow response for a project
  // you've since navigated away from can never land on the wrong one.
  const {
    data: project,
    isLoading: isLoadingProject,
    isFetching: isFetchingProject,
    error: projectError,
    refetch: loadProject,
  } = useQuery({
    queryKey: ['projects', 'detail', id],
    queryFn: ({ signal }) => fetchProject(id, { signal }),
  })
  // Same instant-swap-to-loading behavior on Retry as Projects/Agents/
  // Dashboard: `error` (and therefore `notFound`) stays set for the
  // duration of a retry — only `isFetching` flips true — so this covers
  // that in-flight window instead of leaving the old status message up.
  const isShowingProjectLoadingState = isLoadingProject || (Boolean(projectError) && isFetchingProject)
  const notFound = !isShowingProjectLoadingState && projectError?.status === 404
  const error = !isShowingProjectLoadingState && projectError && !notFound ? projectError.message : null

  const [isFormOpen, setIsFormOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState(null)

  const [agentStatusError, setAgentStatusError] = useState(null)

  const [isAgentFormOpen, setIsAgentFormOpen] = useState(false)
  const [editingAgent, setEditingAgent] = useState(null)

  const [deletingAgent, setDeletingAgent] = useState(null)
  const [isDeletingAgent, setIsDeletingAgent] = useState(false)
  const [deleteAgentError, setDeleteAgentError] = useState(null)

  // The agents API is user-scoped, not project-scoped, so this reads the
  // exact same `['agents']` cache Agents.jsx does and filters it down to
  // this one project — no new endpoint, and no separate cache to fall out
  // of sync with the Agents page.
  const {
    data: allAgents = [],
    isLoading: isLoadingAgents,
    isFetching: isFetchingAgents,
    error: agentsErrorObj,
    refetch: refetchAgents,
  } = useQuery({
    queryKey: AGENTS_QUERY_KEY,
    queryFn: ({ signal }) => fetchAgents({ signal }),
    enabled: Boolean(project),
  })
  const agents = useMemo(
    () => (project ? allAgents.filter((agent) => agent.projectId === project.id) : []),
    [allAgents, project],
  )
  const agentsError = agentsErrorObj?.message ?? null
  const isShowingAgentsLoadingState = isLoadingAgents || (Boolean(agentsError) && isFetchingAgents)

  // Cache sync lives in each mutation's own `onSuccess`/`onError`, mirroring
  // Projects.jsx/Agents.jsx exactly — a failed mutation never writes to
  // either shared cache, so it can't corrupt what those pages show.
  const updateProjectMutation = useMutation({
    mutationFn: (fields) => updateProjectRequest(project.id, fields),
    onSuccess: (updated) => {
      queryClient.setQueryData(['projects', 'detail', id], updated)
      queryClient.setQueryData(PROJECTS_LIST_KEY, (prev) =>
        (prev ?? []).map((p) => (p.id === updated.id ? updated : p)),
      )
    },
  })

  const deleteProjectMutation = useMutation({
    mutationFn: () => deleteProjectRequest(project.id),
    onSuccess: () => {
      // Not clearing the `['projects', 'detail', id]` entry here — doing so
      // makes `project` (and therefore this render) `undefined` before
      // `navigate('/projects')` below has unmounted the page, which the
      // still-open delete-confirm dialog depends on. It's stale but
      // harmless — nothing reads it once we've navigated away, and
      // TanStack garbage-collects unused queries on its own.
      queryClient.setQueryData(PROJECTS_LIST_KEY, (prev) => (prev ?? []).filter((p) => p.id !== project.id))
    },
  })

  const createAgentMutation = useMutation({
    mutationFn: (fields) => createAgentRequest(fields),
    onSuccess: (created) => {
      queryClient.setQueryData(AGENTS_QUERY_KEY, (prev) => [created, ...(prev ?? [])])
    },
  })

  const updateAgentMutation = useMutation({
    mutationFn: ({ id: agentId, fields }) => updateAgentRequest(agentId, fields),
    onSuccess: (updated) => {
      queryClient.setQueryData(AGENTS_QUERY_KEY, (prev) =>
        (prev ?? []).map((agent) => (agent.id === updated.id ? updated : agent)),
      )
    },
  })

  const deleteAgentMutation = useMutation({
    mutationFn: (agent) => deleteAgentRequest(agent.id),
    onSuccess: (_data, agent) => {
      queryClient.setQueryData(AGENTS_QUERY_KEY, (prev) => (prev ?? []).filter((a) => a.id !== agent.id))
    },
  })

  // Same pre-existing optimistic status toggle as Agents.jsx, now against
  // the cache the two pages share — flip immediately, roll back to the
  // exact previous snapshot on failure.
  const toggleAgentStatusMutation = useMutation({
    mutationFn: ({ id: agentId, status }) => updateAgentRequest(agentId, { status }),
    onMutate: async ({ id: agentId, status }) => {
      await queryClient.cancelQueries({ queryKey: AGENTS_QUERY_KEY })
      const previousAgents = queryClient.getQueryData(AGENTS_QUERY_KEY)
      queryClient.setQueryData(AGENTS_QUERY_KEY, (prev) =>
        (prev ?? []).map((a) => (a.id === agentId ? { ...a, status } : a)),
      )
      return { previousAgents }
    },
    onError: (err, _variables, context) => {
      if (context?.previousAgents) queryClient.setQueryData(AGENTS_QUERY_KEY, context.previousAgents)
      setAgentStatusError(err.message)
    },
    onSuccess: (updated) => {
      queryClient.setQueryData(AGENTS_QUERY_KEY, (prev) =>
        (prev ?? []).map((a) => (a.id === updated.id ? updated : a)),
      )
    },
  })

  async function handleSubmitEdit(fields) {
    await updateProjectMutation.mutateAsync(fields)
    setIsFormOpen(false)
  }

  function handleCancelDelete() {
    if (isDeleting) return
    setIsDeleteOpen(false)
    setDeleteError(null)
  }

  async function handleConfirmDelete() {
    setIsDeleting(true)
    setDeleteError(null)
    try {
      await deleteProjectMutation.mutateAsync()
      navigate('/projects')
    } catch (err) {
      setDeleteError(err.message)
      setIsDeleting(false)
    }
  }

  function handleOpenCreateAgent() {
    setEditingAgent(null)
    setIsAgentFormOpen(true)
  }

  function handleOpenEditAgent(agent) {
    setEditingAgent(agent)
    setIsAgentFormOpen(true)
  }

  function handleCloseAgentForm() {
    setIsAgentFormOpen(false)
    setEditingAgent(null)
  }

  async function handleSubmitAgentForm(fields) {
    if (editingAgent) {
      await updateAgentMutation.mutateAsync({ id: editingAgent.id, fields })
    } else {
      await createAgentMutation.mutateAsync(fields)
    }
    handleCloseAgentForm()
  }

  function handleToggleAgentStatus(agentId) {
    const agent = agents.find((a) => a.id === agentId)
    if (!agent) return

    setAgentStatusError(null)
    // Fire-and-forget, same as Agents.jsx: `mutate` never rejects at the
    // call site — the optimistic flip, rollback, and error message are all
    // handled by the mutation's own onMutate/onError above.
    toggleAgentStatusMutation.mutate({ id: agentId, status: nextStatus(agent.status) })
  }

  function handleRequestDeleteAgent(agent) {
    setDeleteAgentError(null)
    setDeletingAgent(agent)
  }

  function handleCancelDeleteAgent() {
    if (isDeletingAgent) return
    setDeletingAgent(null)
    setDeleteAgentError(null)
  }

  async function handleConfirmDeleteAgent() {
    setIsDeletingAgent(true)
    setDeleteAgentError(null)
    try {
      await deleteAgentMutation.mutateAsync(deletingAgent)
      setDeletingAgent(null)
    } catch (err) {
      setDeleteAgentError(err.message)
    } finally {
      setIsDeletingAgent(false)
    }
  }

  return (
    <div className="project-details-page">
      <div className="project-details-container">
        <Link to="/projects" className="project-details-back">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          Back to Projects
        </Link>

        {isShowingProjectLoadingState ? (
          <p className="project-details-status-message">Loading project...</p>
        ) : notFound ? (
          <div className="project-details-status-message">
            <h2>Project not found</h2>
            <p>This project doesn&apos;t exist, or you don&apos;t have access to it.</p>
            <Button to="/projects" variant="secondary">
              Back to Projects
            </Button>
          </div>
        ) : error ? (
          <div className="project-details-status-message">
            <p>{error}</p>
            <Button variant="secondary" onClick={() => loadProject()}>
              Retry
            </Button>
          </div>
        ) : (
          <div className="project-details-card">
            <div className="project-details-header">
              <div>
                <h1>{project.name}</h1>
                <div className={`project-details-status project-details-status-${project.status}`}>
                  <span className="status-dot" />
                  {STATUS_LABELS[project.status]}
                </div>
              </div>
              <div className="project-details-actions">
                <Button variant="secondary" onClick={() => setIsFormOpen(true)}>
                  Edit Project
                </Button>
                <Button variant="danger" onClick={() => setIsDeleteOpen(true)}>
                  Delete Project
                </Button>
              </div>
            </div>

            <p className="project-details-description">{project.description || 'No description provided.'}</p>

            <div className="project-details-meta">
              <div className="project-details-meta-item">
                <span className="project-details-meta-label">Project ID</span>
                <span className="project-details-meta-value">#{project.id}</span>
              </div>
              <div className="project-details-meta-item">
                <span className="project-details-meta-label">Created</span>
                <span className="project-details-meta-value">{formatDate(project.createdAt) ?? '—'}</span>
              </div>
              <div className="project-details-meta-item">
                <span className="project-details-meta-label">Last updated</span>
                <span className="project-details-meta-value">{formatDate(project.updatedAt) ?? '—'}</span>
              </div>
            </div>
          </div>
        )}

        {project && (
          <div className="project-details-card project-details-agents">
            <div className="project-details-agents-header">
              <h2>Agents{agents.length > 0 ? ` (${agents.length})` : ''}</h2>
              <Button variant="secondary" onClick={handleOpenCreateAgent}>
                + Add Agent
              </Button>
            </div>

            {agentStatusError && <p className="project-details-agents-error">{agentStatusError}</p>}

            {isShowingAgentsLoadingState ? (
              <p className="project-details-agents-status">Loading agents...</p>
            ) : agentsError ? (
              <div className="project-details-agents-status">
                <p>{agentsError}</p>
                <Button variant="secondary" onClick={() => refetchAgents()}>
                  Retry
                </Button>
              </div>
            ) : agents.length === 0 ? (
              <p className="project-details-agents-status">
                No agents assigned to this project yet.
              </p>
            ) : (
              <div className="project-details-agents-grid">
                {agents.map((agent) => (
                  <AgentCard
                    key={agent.id}
                    agent={agent}
                    showProject={false}
                    onToggleStatus={handleToggleAgentStatus}
                    onEdit={handleOpenEditAgent}
                    onDelete={handleRequestDeleteAgent}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {isAgentFormOpen && (
        <AgentFormModal
          agent={editingAgent}
          lockedProjectId={project.id}
          lockedProjectName={project.name}
          onClose={handleCloseAgentForm}
          onSubmit={handleSubmitAgentForm}
        />
      )}

      {deletingAgent && (
        <ConfirmDialog
          title="Delete agent"
          message={`Are you sure you want to delete "${deletingAgent.name}"? This cannot be undone.`}
          confirmLabel="Delete"
          isSubmitting={isDeletingAgent}
          error={deleteAgentError}
          onConfirm={handleConfirmDeleteAgent}
          onCancel={handleCancelDeleteAgent}
        />
      )}

      {isFormOpen && (
        <ProjectFormModal project={project} onClose={() => setIsFormOpen(false)} onSubmit={handleSubmitEdit} />
      )}

      {isDeleteOpen && (
        <ConfirmDialog
          title="Delete project"
          message={`Are you sure you want to delete "${project.name}"? This cannot be undone.`}
          confirmLabel="Delete"
          isSubmitting={isDeleting}
          error={deleteError}
          onConfirm={handleConfirmDelete}
          onCancel={handleCancelDelete}
        />
      )}
    </div>
  )
}

export default ProjectDetails
