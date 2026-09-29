import Button from '../Button'
import Icon from '../icons/Icon'
import { STATUS_LABELS } from './projectsData'
import './ProjectCard.css'

function ProjectCard({ project, onEdit, onDelete }) {
  return (
    <div className="project-card">
      <div className="project-card-header">
        <h3>{project.name}</h3>
        <div className={`project-status project-status-${project.status}`}>
          <span className="status-dot" />
          {STATUS_LABELS[project.status]}
        </div>
      </div>

      <p>{project.description || 'No description provided.'}</p>

      <div className="project-meta">
        <span className="project-meta-item">
          <Icon name="clock" size={14} />
          {project.lastUpdated}
        </span>
        <span className="project-meta-item">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
          {project.agentCount} {project.agentCount === 1 ? 'agent' : 'agents'}
        </span>
      </div>

      <div className="project-card-actions">
        <Button to={`/projects/${project.id}`} variant="secondary">
          Open Project
        </Button>
        <div className="project-card-icon-actions">
          <button
            type="button"
            className="project-card-icon-btn"
            aria-label={`Edit ${project.name}`}
            title="Edit project"
            onClick={() => onEdit(project)}
          >
            <Icon name="edit" size={15} />
          </button>
          <button
            type="button"
            className="project-card-icon-btn project-card-icon-btn-danger"
            aria-label={`Delete ${project.name}`}
            title="Delete project"
            onClick={() => onDelete(project)}
          >
            <Icon name="trash" size={15} />
          </button>
        </div>
      </div>
    </div>
  )
}

export default ProjectCard
