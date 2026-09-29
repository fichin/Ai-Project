import AgentIcon from './AgentIcon'
import Button from '../Button'
import Icon from '../icons/Icon'
import { STATUS_LABELS, actionLabel } from './agentsData'
import './AgentCard.css'

function AgentCard({ agent, onToggleStatus, onEdit, onDelete, showProject = true }) {
  return (
    <div className="agent-card">
      <div className="agent-card-header">
        <div className="agent-icon">
          <AgentIcon type={agent.icon} />
        </div>
        <div className={`agent-status agent-status-${agent.status}`}>
          <span className="status-dot" />
          {STATUS_LABELS[agent.status]}
        </div>
      </div>

      <h3>{agent.name}</h3>
      <p>{agent.description || 'No description provided.'}</p>

      <div className="agent-card-meta">
        {showProject && (
          <span className="agent-card-meta-item">
            <Icon name="folder" size={14} />
            {agent.projectName ?? 'No project'}
          </span>
        )}
        <span className="agent-card-meta-item">
          <Icon name="clock" size={14} />
          {agent.lastUpdated}
        </span>
      </div>

      <div className="agent-card-actions">
        <Button variant="secondary" onClick={() => onToggleStatus(agent.id)}>
          {actionLabel(agent.status)}
        </Button>
        <div className="agent-card-icon-actions">
          <button
            type="button"
            className="agent-card-icon-btn"
            aria-label={`Edit ${agent.name}`}
            title="Edit agent"
            onClick={() => onEdit(agent)}
          >
            <Icon name="edit" size={15} />
          </button>
          <button
            type="button"
            className="agent-card-icon-btn agent-card-icon-btn-danger"
            aria-label={`Delete ${agent.name}`}
            title="Delete agent"
            onClick={() => onDelete(agent)}
          >
            <Icon name="trash" size={15} />
          </button>
        </div>
      </div>
    </div>
  )
}

export default AgentCard
