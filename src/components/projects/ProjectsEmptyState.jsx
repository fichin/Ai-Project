import Button from '../Button'
import Icon from '../icons/Icon'
import './ProjectsEmptyState.css'

function ProjectsEmptyState({ onClearFilters }) {
  return (
    <div className="projects-empty">
      <div className="projects-empty-icon" aria-hidden="true">
        <Icon name="search" size={22} />
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
