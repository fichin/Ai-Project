import { STATUS_FILTERS, STATUS_LABELS } from './agentsData'
import Icon from '../icons/Icon'
import './AgentsToolbar.css'

function AgentsToolbar({ search, onSearchChange, statusFilter, onStatusFilterChange }) {
  return (
    <div className="agents-toolbar">
      <div className="agents-search">
        <Icon name="search" size={16} />
        <input
          type="text"
          placeholder="Search agents..."
          aria-label="Search agents"
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
        />
      </div>

      <div className="agents-filters">
        {STATUS_FILTERS.map((status) => (
          <button
            key={status}
            className={`filter-chip ${statusFilter === status ? 'active' : ''}`}
            onClick={() => onStatusFilterChange(status)}
            aria-pressed={statusFilter === status}
          >
            {status === 'all' ? 'All' : STATUS_LABELS[status]}
          </button>
        ))}
      </div>
    </div>
  )
}

export default AgentsToolbar
