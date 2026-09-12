import { STATUS_FILTERS, STATUS_LABELS } from './projectsData'
import './ProjectsToolbar.css'

function ProjectsToolbar({ search, onSearchChange, statusFilter, onStatusFilterChange }) {
  return (
    <div className="projects-toolbar">
      <div className="projects-search">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="7" />
          <path d="m21 21-4.3-4.3" />
        </svg>
        <input
          type="text"
          placeholder="Search projects..."
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
        />
      </div>

      <div className="projects-filters">
        {STATUS_FILTERS.map((status) => (
          <button
            key={status}
            className={`filter-chip ${statusFilter === status ? 'active' : ''}`}
            onClick={() => onStatusFilterChange(status)}
          >
            {status === 'all' ? 'All' : STATUS_LABELS[status]}
          </button>
        ))}
      </div>
    </div>
  )
}

export default ProjectsToolbar
