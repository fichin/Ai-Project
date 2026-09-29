import { useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import Button from '../components/Button'
import Footer from '../components/Footer'
import ConfirmDialog from '../components/ConfirmDialog'
import AgentCard from '../components/agents/AgentCard'
import AgentsToolbar from '../components/agents/AgentsToolbar'
import AgentsEmptyState from '../components/agents/AgentsEmptyState'
import AgentFormModal from '../components/agents/AgentFormModal'
import { nextStatus } from '../components/agents/agentsData'
import { fetchAgents, createAgentRequest, updateAgentRequest, deleteAgentRequest } from '../components/agents/agentsApi'
import { fetchProjects } from '../components/projects/projectsApi'
import { useDeleteConfirmation } from '../hooks/useDeleteConfirmation'
import './Agents.css'

const AGENTS_QUERY_KEY = ['agents']
const PROJECTS_QUERY_KEY = ['projects']

function Agents() {
  const location = useLocation()
  const queryClient = useQueryClient()
  const [statusError, setStatusError] = useState(null)
  // Arriving here from a command-palette "Agent" search result — see
  // CommandPalette.jsx — lands on this existing search/filter UI already
  // narrowed to that agent, instead of an unfiltered list.
  const [search, setSearch] = useState(location.state?.presetSearch ?? '')
  const [statusFilter, setStatusFilter] = useState('all')

  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingAgent, setEditingAgent] = useState(null)

  // Two independent queries — `['agents']` is the one this page mutates,
  // `['projects']` (same key the Projects page uses) is only read here, for
  // the form's project picker and the empty state's "create a project
  // first" hint. Their loading/error surface is still combined below so the
  // page keeps its one "Loading agents..." message and one Retry button
  // that reloads both, exactly like the previous `Promise.all` fetch.
  const {
    data: agents = [],
    isLoading: isLoadingAgents,
    isFetching: isFetchingAgents,
    error: agentsError,
    refetch: refetchAgents,
  } = useQuery({
    queryKey: AGENTS_QUERY_KEY,
    queryFn: ({ signal }) => fetchAgents({ signal }),
  })
  const {
    data: projects = [],
    isLoading: isLoadingProjects,
    isFetching: isFetchingProjects,
    error: projectsError,
    refetch: refetchProjects,
  } = useQuery({
    queryKey: PROJECTS_QUERY_KEY,
    queryFn: ({ signal }) => fetchProjects({ signal }),
  })

  const loadError = agentsError?.message ?? projectsError?.message ?? null
  // Same reasoning as Projects.jsx: once either query has failed, `status`
  // stays "error" for the duration of a manual retry — only `isFetching`
  // flips true — so this covers the retry-in-flight case the same way the
  // previous `isLoading` (reset to true on every retry) did.
  const isShowingLoadingState =
    isLoadingAgents || isLoadingProjects || (Boolean(loadError) && (isFetchingAgents || isFetchingProjects))

  function loadAll() {
    refetchAgents()
    refetchProjects()
  }

  // Cache sync lives in each mutation's own `onSuccess`/`onError`, which
  // only run once the server has actually confirmed the change (or, for the
  // optimistic status toggle below, roll back to the last known-good data)
  // — so a failed mutation never leaves `['agents']` out of sync with the
  // server. `mutateAsync` is used for create/update/delete so failures
  // still reject the awaited call, letting useSubmitState /
  // useDeleteConfirmation's existing try/catch surface the error exactly as
  // it did with the raw async calls.
  const createAgentMutation = useMutation({
    mutationFn: (fields) => createAgentRequest(fields),
    onSuccess: (created) => {
      queryClient.setQueryData(AGENTS_QUERY_KEY, (prev) => [created, ...(prev ?? [])])
    },
  })

  const updateAgentMutation = useMutation({
    mutationFn: ({ id, fields }) => updateAgentRequest(id, fields),
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

  // The quick status toggle on each card was already optimistic before this
  // migration (flip immediately, roll back on failure) — that UX is
  // preserved as-is here via TanStack's onMutate/onError pattern, just
  // moving "the last known-good list" from a local closure variable into
  // the query cache.
  const toggleStatusMutation = useMutation({
    mutationFn: ({ id, status }) => updateAgentRequest(id, { status }),
    onMutate: async ({ id, status }) => {
      await queryClient.cancelQueries({ queryKey: AGENTS_QUERY_KEY })
      const previousAgents = queryClient.getQueryData(AGENTS_QUERY_KEY)
      queryClient.setQueryData(AGENTS_QUERY_KEY, (prev) =>
        (prev ?? []).map((a) => (a.id === id ? { ...a, status } : a)),
      )
      return { previousAgents }
    },
    onError: (err, _variables, context) => {
      if (context?.previousAgents) queryClient.setQueryData(AGENTS_QUERY_KEY, context.previousAgents)
      setStatusError(err.message)
    },
    onSuccess: (updated) => {
      queryClient.setQueryData(AGENTS_QUERY_KEY, (prev) =>
        (prev ?? []).map((a) => (a.id === updated.id ? updated : a)),
      )
    },
  })

  const {
    pendingItem: deletingAgent,
    isDeleting,
    error: deleteError,
    request: handleRequestDelete,
    cancel: handleCancelDelete,
    confirm: handleConfirmDelete,
  } = useDeleteConfirmation(
    (agent) => deleteAgentMutation.mutateAsync(agent),
    // The cache is already synced by the mutation's own onSuccess above —
    // this hook's onDeleted only needs to exist to satisfy its signature.
    () => {},
  )

  const filteredAgents = useMemo(() => {
    return agents.filter((agent) => {
      const matchesSearch =
        agent.name.toLowerCase().includes(search.toLowerCase()) ||
        agent.description.toLowerCase().includes(search.toLowerCase())
      const matchesStatus = statusFilter === 'all' || agent.status === statusFilter
      return matchesSearch && matchesStatus
    })
  }, [agents, search, statusFilter])

  function handleClearFilters() {
    setSearch('')
    setStatusFilter('all')
  }

  function handleOpenCreateForm() {
    setEditingAgent(null)
    setIsFormOpen(true)
  }

  function handleOpenEditForm(agent) {
    setEditingAgent(agent)
    setIsFormOpen(true)
  }

  function handleCloseForm() {
    setIsFormOpen(false)
    setEditingAgent(null)
  }

  async function handleSubmitForm(fields) {
    if (editingAgent) {
      await updateAgentMutation.mutateAsync({ id: editingAgent.id, fields })
    } else {
      await createAgentMutation.mutateAsync(fields)
    }
    handleCloseForm()
  }

  function handleToggleStatus(id) {
    const agent = agents.find((a) => a.id === id)
    if (!agent) return

    setStatusError(null)
    // Fire-and-forget, same as before: the caller (AgentCard) doesn't await
    // this, and `mutate` (not `mutateAsync`) never rejects at the call
    // site — the optimistic flip, rollback, and error message are all
    // handled by the mutation's own onMutate/onError above.
    toggleStatusMutation.mutate({ id, status: nextStatus(agent.status) })
  }

  return (
    <div className="agents-page">
      <div className="agents-container">
        <div className="agents-header">
          <div>
            <h1 className="page-title">Agents</h1>
            <p className="page-subtitle">Create and manage autonomous agents that work on your behalf.</p>
          </div>
          <Button variant="primary" onClick={handleOpenCreateForm}>
            + Create Agent
          </Button>
        </div>

        {statusError && <p className="agents-inline-error">{statusError}</p>}

        <AgentsToolbar
          search={search}
          onSearchChange={setSearch}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
        />

        {isShowingLoadingState ? (
          <p className="agents-status-message">Loading agents...</p>
        ) : loadError ? (
          <div className="agents-status-message">
            <p>{loadError}</p>
            <Button variant="secondary" onClick={() => loadAll()}>
              Retry
            </Button>
          </div>
        ) : filteredAgents.length === 0 ? (
          <AgentsEmptyState
            hasAgents={agents.length > 0}
            hasProjects={projects.length > 0}
            onClearFilters={handleClearFilters}
            onCreate={handleOpenCreateForm}
          />
        ) : (
          <div className="agents-grid">
            <h2 className="sr-only">Agent list</h2>
            {filteredAgents.map((agent) => (
              <AgentCard
                key={agent.id}
                agent={agent}
                onToggleStatus={handleToggleStatus}
                onEdit={handleOpenEditForm}
                onDelete={handleRequestDelete}
              />
            ))}
          </div>
        )}
      </div>

      <Footer />

      {isFormOpen && (
        <AgentFormModal agent={editingAgent} projects={projects} onClose={handleCloseForm} onSubmit={handleSubmitForm} />
      )}

      {deletingAgent && (
        <ConfirmDialog
          title="Delete agent"
          message={`Are you sure you want to delete "${deletingAgent.name}"? This cannot be undone.`}
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

export default Agents
