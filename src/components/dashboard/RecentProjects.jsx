import { Link } from 'react-router-dom'
import { STATUS_LABELS } from '../projects/projectsData'
import './RecentProjects.css'

function RecentProjects({ projects, isLoading }) {
  return (
    <div className="recent-projects">
      <div className="recent-projects-header">
        <h2>Recent Projects</h2>
        <Link to="/projects" className="recent-projects-link">
          View all projects &rarr;
        </Link>
      </div>

      {isLoading ? (
        <div className="recent-projects-list">
          {[0, 1, 2].map((key) => (
            <div key={key} className="recent-project-skeleton" />
          ))}
        </div>
      ) : !projects || projects.length === 0 ? (
        <div className="recent-projects-empty">
          <p>No projects yet.</p>
          <Link to="/projects" className="recent-projects-empty-link">
            Create your first project &rarr;
          </Link>
        </div>
      ) : (
        <div className="recent-projects-list">
          {projects.map((project) => (
            <div key={project.id} className="recent-project-row">
              <div className="recent-project-avatar">{project.name.slice(0, 2).toUpperCase()}</div>
              <div className="recent-project-info">
                <div className="recent-project-name">{project.name}</div>
                <div className="recent-project-meta">
                  {project.agentCount} {project.agentCount === 1 ? 'agent' : 'agents'} &middot; Updated{' '}
                  {project.lastUpdated}
                </div>
              </div>
              <div className={`recent-project-status recent-project-status-${project.status}`}>
                <span className="status-dot" />
                {STATUS_LABELS[project.status]}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default RecentProjects
