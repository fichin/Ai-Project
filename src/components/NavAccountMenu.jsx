import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import Avatar from './Avatar'
import { useDismissableLayer } from '../hooks/useDismissableLayer'
import './NavAccountMenu.css'

// The session-aware replacement for the logged-out Navbar's "Log in / Sign
// up" actions — shown instead when `user` is set (see Navbar.jsx).
function NavAccountMenu({ user, onLogout }) {
  const [isOpen, setIsOpen] = useState(false)
  const rootRef = useRef(null)

  // Escape-to-close and click-outside-to-close are shared with
  // NotificationsBell via useDismissableLayer — this is a lightweight
  // popover, not a modal dialog, so it intentionally doesn't get the hook's
  // focus-trap behavior (no dialogRef passed).
  useDismissableLayer({ isOpen, onDismiss: () => setIsOpen(false), containerRef: rootRef })

  function close() {
    setIsOpen(false)
  }

  async function handleLogout() {
    close()
    await onLogout()
  }

  return (
    <div className="nav-account" ref={rootRef}>
      <button
        type="button"
        className="nav-account-trigger"
        onClick={() => setIsOpen((open) => !open)}
        aria-haspopup="menu"
        aria-expanded={isOpen}
      >
        <Avatar name={user.name} avatarId={user.avatarId} size={28} />
        <span className="nav-account-name">{user.name}</span>
        <svg
          className={`nav-account-chevron ${isOpen ? 'nav-account-chevron-open' : ''}`}
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden="true"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {isOpen && (
        <div className="nav-account-dropdown" role="menu">
          <div className="nav-account-dropdown-header">
            <Avatar name={user.name} avatarId={user.avatarId} size={36} />
            <div className="nav-account-dropdown-identity">
              <span className="nav-account-dropdown-name">{user.name}</span>
              <span className="nav-account-dropdown-email">{user.email}</span>
            </div>
          </div>

          <div className="nav-account-dropdown-divider" />

          <Link to="/dashboard" className="nav-account-dropdown-item" role="menuitem" onClick={close}>
            Dashboard
          </Link>
          <Link to="/settings" className="nav-account-dropdown-item" role="menuitem" onClick={close}>
            Settings
          </Link>
          <button
            type="button"
            className="nav-account-dropdown-item nav-account-dropdown-logout"
            role="menuitem"
            onClick={handleLogout}
          >
            Log out
          </button>
        </div>
      )}
    </div>
  )
}

export default NavAccountMenu
