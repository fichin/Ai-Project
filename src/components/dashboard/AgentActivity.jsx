import { Link } from 'react-router-dom'
import { STATUS_LABELS } from '../agents/agentsData'
import './AgentActivity.css'

function AgentActivity({ agents, isLoading }) {
  return (
    <div className="agent-activity">
      <div className="agent-activity-header">
        <h2>Agent Activity</h2>
        <Link to="/agents" className="agent-activity-link">
          View all &rarr;
        </Link>
      </div>

      {isLoading ? (
        <div className="agent-activity-list">
          {[0, 1, 2].map((key) => (
            <div key={key} className="agent-activity-skeleton" />
          ))}
        </div>
      ) : !agents || agents.length === 0 ? (
        <div className="agent-activity-empty">
          <p>No agents yet.</p>
          <Link to="/agents" className="agent-activity-empty-link">
            Create your first agent &rarr;
          </Link>
        </div>
      ) : (
        <div className="agent-activity-list">
          {agents.map((agent) => (
            <div key={agent.id} className="agent-activity-row">
              <span className={`agent-activity-dot agent-activity-dot-${agent.status}`} />
              <div className="agent-activity-info">
                <div className="agent-activity-name">{agent.name}</div>
                <div className="agent-activity-meta">
                  {agent.projectName ?? 'No project'} &middot; Updated {agent.lastUpdated}
                </div>
              </div>
              <span className={`agent-activity-status agent-activity-status-${agent.status}`}>
                {STATUS_LABELS[agent.status]}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default AgentActivity
