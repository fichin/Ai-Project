import { Link } from 'react-router-dom'
import './QuickActions.css'

const ACTIONS = [
  {
    to: '/projects',
    label: 'New Project',
    description: 'Start organizing a new initiative',
    icon: <path d="M12 5v14M5 12h14" />,
  },
  {
    to: '/assistant',
    label: 'Open AI Assistant',
    description: 'Chat with your assistant',
    icon: <path d="M21 11.5a8.5 8.5 0 0 1-8.5 8.5H3l2.4-4.2A8.5 8.5 0 1 1 21 11.5Z" />,
  },
  {
    to: '/agents',
    label: 'Create Agent',
    description: 'Deploy a new autonomous agent',
    icon: (
      <>
        <rect x="3" y="11" width="18" height="10" rx="2" />
        <path d="M12 11V7M8 7h8M9 16h.01M15 16h.01" />
      </>
    ),
  },
  {
    to: '/projects',
    label: 'View Projects',
    description: 'See everything in progress',
    icon: <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z" />,
  },
]

function QuickActions() {
  return (
    <div className="quick-actions">
      <h2 className="quick-actions-title">Quick Actions</h2>
      <div className="quick-actions-grid">
        {ACTIONS.map((action) => (
          <Link key={action.label} to={action.to} className="quick-action-card">
            <div className="quick-action-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                {action.icon}
              </svg>
            </div>
            <div>
              <div className="quick-action-label">{action.label}</div>
              <div className="quick-action-description">{action.description}</div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}

export default QuickActions
