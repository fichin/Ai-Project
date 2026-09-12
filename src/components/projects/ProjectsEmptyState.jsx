import Button from '../Button'
import './ProjectsEmptyState.css'

function ProjectsEmptyState({ onClearFilters }) {
  return (
    <div className="projects-empty">
      <div className="projects-empty-icon" aria-hidden="true">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="7" />
          <path d="m21 21-4.3-4.3" />
        </svg>
      </div>
      <h3>No projects found</h3>
      <p>Try a different search term or clear your filters to see all projects.</p>
      <Button variant="secondary" onClick={onClearFilters}>
        Clear filters
      </Button>
    </div>
  )
}

export default ProjectsEmptyState
