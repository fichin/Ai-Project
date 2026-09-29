import { STATUS_FILTERS, STATUS_LABELS } from './projectsData'
import Icon from '../icons/Icon'
import './ProjectsToolbar.css'

function ProjectsToolbar({ search, onSearchChange, statusFilter, onStatusFilterChange }) {
  return (
    <div className="projects-toolbar">
      <div className="projects-search">
        <Icon name="search" size={16} />
        <input
          type="text"
          placeholder="Search projects..."
          aria-label="Search projects"
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
            aria-pressed={statusFilter === status}
          >
            {status === 'all' ? 'All' : STATUS_LABELS[status]}
          </button>
        ))}
      </div>
    </div>
  )
}

export default ProjectsToolbar
