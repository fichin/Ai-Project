import { NavLink, Link } from 'react-router-dom'
import { useAuth } from '../../context/useAuth'
import Avatar from '../Avatar'
import Icon from '../icons/Icon'
import './AppSidebar.css'

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', icon: 'dashboard' },
  { to: '/assistant', label: 'AI Assistant', icon: 'chat' },
  { to: '/agents', label: 'Agents', icon: 'bot' },
  { to: '/projects', label: 'Projects', icon: 'folder' },
  { to: '/settings', label: 'Settings', icon: 'settings' },
]

function AppSidebar({ isOpen, onClose, isCollapsed, onToggleCollapse, onLogout }) {
  const { user } = useAuth()

  return (
    <aside className={`app-sidebar ${isOpen ? 'app-sidebar-open' : ''} ${isCollapsed ? 'app-sidebar-collapsed' : ''}`}>
      <Link to="/" className="app-sidebar-logo" onClick={onClose}>
        <span className="app-sidebar-logo-mark">AI</span>
        <span className="app-sidebar-logo-text">AI PROJECT</span>
      </Link>

      <nav className="app-sidebar-nav">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => `app-sidebar-link ${isActive ? 'active' : ''}`}
            onClick={onClose}
            title={item.label}
          >
            <Icon name={item.icon} size={18} />
            <span className="app-sidebar-link-label">{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <button
        type="button"
        className="app-sidebar-collapse-toggle"
        onClick={onToggleCollapse}
        aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className={isCollapsed ? 'app-sidebar-collapse-icon-flipped' : ''}
          aria-hidden="true"
        >
          <path d="M11 19l-7-7 7-7M4 12h16" />
        </svg>
        <span className="app-sidebar-link-label">Collapse sidebar</span>
      </button>

      <div className="app-sidebar-footer">
        <div className="app-sidebar-user">
          <Avatar name={user?.name} avatarId={user?.avatarId} size={34} />
          <div className="app-sidebar-user-info">
            <span className="app-sidebar-user-name">{user?.name ?? 'Account'}</span>
            <span className="app-sidebar-user-email">{user?.email ?? ''}</span>
          </div>
        </div>
        <button className="app-sidebar-logout" onClick={onLogout} aria-label="Log out" title="Log out">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
          </svg>
        </button>
      </div>
    </aside>
  )
}

export default AppSidebar
