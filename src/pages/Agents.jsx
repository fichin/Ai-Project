import { useEffect, useMemo, useState } from 'react'
import Button from '../components/Button'
import Footer from '../components/Footer'
import AgentCard from '../components/agents/AgentCard'
import AgentsToolbar from '../components/agents/AgentsToolbar'
import AgentsEmptyState from '../components/agents/AgentsEmptyState'
import { DRAFT_AGENT_DEFAULTS, nextStatus } from '../components/agents/agentsData'
import { fetchAgents, createAgentRequest, updateAgentRequest } from '../components/agents/agentsApi'
import './Agents.css'

function Agents() {
  const [agents, setAgents] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)
  const [isCreating, setIsCreating] = useState(false)
  const [createError, setCreateError] = useState(null)
  const [statusError, setStatusError] = useState(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  useEffect(() => {
    loadAgents()
  }, [])

  async function loadAgents() {
    setIsLoading(true)
    setLoadError(null)
    try {
      const data = await fetchAgents()
      setAgents(data)
    } catch (error) {
      setLoadError(error.message)
    } finally {
      setIsLoading(false)
    }
  }

  const filteredAgents = useMemo(() => {
    return agents.filter((agent) => {
      const matchesSearch =
        agent.name.toLowerCase().includes(search.toLowerCase()) ||
        agent.description.toLowerCase().includes(search.toLowerCase())
      const matchesStatus = statusFilter === 'all' || agent.status === statusFilter
      return matchesSearch && matchesStatus
    })
  }, [agents, search, statusFilter])

  async function handleCreateAgent() {
    setIsCreating(true)
    setCreateError(null)
    try {
      const agent = await createAgentRequest(DRAFT_AGENT_DEFAULTS)
      setAgents((prev) => [agent, ...prev])
      setSearch('')
      setStatusFilter('all')
    } catch (error) {
      setCreateError(error.message)
    } finally {
      setIsCreating(false)
    }
  }

  async function handleToggleStatus(id) {
    const agent = agents.find((a) => a.id === id)
    if (!agent) return

    setStatusError(null)
    const previousAgents = agents
    const optimisticStatus = nextStatus(agent.status)
    setAgents((prev) => prev.map((a) => (a.id === id ? { ...a, status: optimisticStatus } : a)))

    try {
      const updated = await updateAgentRequest(id, { status: optimisticStatus })
      setAgents((prev) => prev.map((a) => (a.id === id ? updated : a)))
    } catch (error) {
      setAgents(previousAgents)
      setStatusError(error.message)
    }
  }

  function handleClearFilters() {
    setSearch('')
    setStatusFilter('all')
  }

  return (
    <div className="agents-page">
      <div className="agents-container">
        <div className="agents-header">
          <div>
            <h1>Agents</h1>
            <p>Create and manage autonomous agents that work on your behalf.</p>
          </div>
          <Button variant="primary" onClick={handleCreateAgent} disabled={isCreating}>
            {isCreating ? 'Creating...' : '+ Create Agent'}
          </Button>
        </div>

        {createError && <p className="agents-inline-error">{createError}</p>}
        {statusError && <p className="agents-inline-error">{statusError}</p>}

        <AgentsToolbar
          search={search}
          onSearchChange={setSearch}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
        />

        {isLoading ? (
          <p className="agents-status-message">Loading agents...</p>
        ) : loadError ? (
          <div className="agents-status-message">
            <p>{loadError}</p>
            <Button variant="secondary" onClick={loadAgents}>
              Retry
            </Button>
          </div>
        ) : filteredAgents.length === 0 ? (
          <AgentsEmptyState onClearFilters={handleClearFilters} />
        ) : (
          <div className="agents-grid">
            {filteredAgents.map((agent) => (
              <AgentCard key={agent.id} agent={agent} onToggleStatus={handleToggleStatus} />
            ))}
          </div>
        )}
      </div>

      <Footer />
    </div>
  )
}

export default Agents
