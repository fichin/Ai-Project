import { Link } from 'react-router-dom'
import Button from '../Button'
import Icon from '../icons/Icon'
import './AgentsEmptyState.css'

// Two distinct situations get two distinct messages: a genuinely empty
// workspace (with a real CTA to fix it) vs. a search/filter that matched
// nothing (where "no agents" would be misleading — the agents still exist).
function AgentsEmptyState({ hasAgents, hasProjects, onClearFilters, onCreate }) {
  if (hasAgents) {
    return (
      <div className="agents-empty">
        <div className="agents-empty-icon" aria-hidden="true">
          <Icon name="search" size={22} />
        </div>
        <h3>No agents found</h3>
        <p>Try a different search term or clear your filters to see all agents.</p>
        <Button variant="secondary" onClick={onClearFilters}>
          Clear filters
        </Button>
      </div>
    )
  }

  return (
    <div className="agents-empty">
      <div className="agents-empty-icon" aria-hidden="true">
        <Icon name="chat" size={22} />
      </div>
      <h3>No agents yet</h3>
      <p>Create your first AI agent to start building intelligent workflows.</p>
      <Button variant="primary" onClick={onCreate}>
        Create Agent
      </Button>
      {!hasProjects && (
        <p className="agents-empty-hint">
          You don&apos;t have any projects yet — agents can stay unassigned, or{' '}
          <Link to="/projects">create a project</Link> to organize them.
        </p>
      )}
    </div>
  )
}

export default AgentsEmptyState
