import AgentIcon from './AgentIcon'
import Button from '../Button'
import { STATUS_LABELS, actionLabel } from './agentsData'
import './AgentCard.css'

function AgentCard({ agent, onToggleStatus }) {
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
      <p>{agent.description}</p>

      <Button variant="secondary" onClick={() => onToggleStatus(agent.id)}>
        {actionLabel(agent.status)}
      </Button>
    </div>
  )
}

export default AgentCard
