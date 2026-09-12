import { NavLink, Link } from 'react-router-dom'
import { useAuth } from '../../context/useAuth'
import Avatar from '../Avatar'
import './AppSidebar.css'

const NAV_ITEMS = [
  {
    to: '/dashboard',
    label: 'Dashboard',
    icon: (
      <>
        <rect x="3" y="3" width="7" height="9" rx="1.5" />
        <rect x="14" y="3" width="7" height="5" rx="1.5" />
        <rect x="14" y="12" width="7" height="9" rx="1.5" />
        <rect x="3" y="16" width="7" height="5" rx="1.5" />
      </>
    ),
  },
  {
    to: '/assistant',
    label: 'AI Assistant',
    icon: <path d="M21 11.5a8.5 8.5 0 0 1-8.5 8.5H3l2.4-4.2A8.5 8.5 0 1 1 21 11.5Z" />,
  },
  {
    to: '/agents',
    label: 'Agents',
    icon: (
      <>
        <rect x="3" y="11" width="18" height="10" rx="2" />
        <path d="M12 11V7M8 7h8M9 16h.01M15 16h.01" />
      </>
    ),
  },
  {
    to: '/projects',
    label: 'Projects',
    icon: <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z" />,
  },
  {
    to: '/settings',
    label: 'Settings',
    icon: (
      <>
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.7 1.7 0 0 0 .33 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.33 1.7 1.7 0 0 0-1.03 1.55V21a2 2 0 1 1-4 0v-.09a1.7 1.7 0 0 0-1.03-1.55 1.7 1.7 0 0 0-1.87.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.7 1.7 0 0 0 .33-1.87 1.7 1.7 0 0 0-1.55-1.03H3a2 2 0 1 1 0-4h.09A1.7 1.7 0 0 0 4.6 9a1.7 1.7 0 0 0-.33-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1.03-1.55V3a2 2 0 1 1 4 0v.09A1.7 1.7 0 0 0 15 4.6a1.7 1.7 0 0 0 1.87-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.7 1.7 0 0 0 19.4 9a1.7 1.7 0 0 0 1.55 1.03H21a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-1.55 1Z" />
      </>
    ),
  },
]

function AppSidebar({ isOpen, onClose, onLogout }) {
  const { user } = useAuth()

  return (
    <aside className={`app-sidebar ${isOpen ? 'app-sidebar-open' : ''}`}>
      <Link to="/" className="app-sidebar-logo" onClick={onClose}>
        <span className="app-sidebar-logo-mark">AI</span>
        AI PROJECT
      </Link>

      <nav className="app-sidebar-nav">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => `app-sidebar-link ${isActive ? 'active' : ''}`}
            onClick={onClose}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              {item.icon}
            </svg>
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="app-sidebar-footer">
        <div className="app-sidebar-user">
          <Avatar name={user?.name} avatarId={user?.avatarId} size={34} />
          <div className="app-sidebar-user-info">
            <span className="app-sidebar-user-name">{user?.name ?? 'Account'}</span>
            <span className="app-sidebar-user-email">{user?.email ?? ''}</span>
          </div>
        </div>
        <button className="app-sidebar-logout" onClick={onLogout} aria-label="Log out" title="Log out">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
          </svg>
        </button>
      </div>
    </aside>
  )
}

export default AppSidebar
