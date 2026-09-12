import Button from '../Button'
import './AgentsEmptyState.css'

function AgentsEmptyState({ onClearFilters }) {
  return (
    <div className="agents-empty">
      <div className="agents-empty-icon" aria-hidden="true">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="7" />
          <path d="m21 21-4.3-4.3" />
        </svg>
      </div>
      <h3>No agents found</h3>
      <p>Try a different search term or clear your filters to see all agents.</p>
      <Button variant="secondary" onClick={onClearFilters}>
        Clear filters
      </Button>
    </div>
  )
}

export default AgentsEmptyState
