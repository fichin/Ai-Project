import { Link } from 'react-router-dom'
import Icon from '../icons/Icon'
import './QuickActions.css'

const ACTIONS = [
  {
    to: '/projects',
    label: 'New Project',
    description: 'Start organizing a new initiative',
    icon: 'plus',
  },
  {
    to: '/assistant',
    label: 'Open AI Assistant',
    description: 'Chat with your assistant',
    icon: 'chat',
  },
  {
    to: '/agents',
    label: 'Create Agent',
    description: 'Deploy a new autonomous agent',
    icon: 'bot',
  },
  {
    to: '/projects',
    label: 'View Projects',
    description: 'See everything in progress',
    icon: 'folder',
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
              <Icon name={action.icon} size={18} />
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
