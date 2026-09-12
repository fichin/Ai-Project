import { useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import Button from './Button'
import NavAccountMenu from './NavAccountMenu'
import { useAuth } from '../context/useAuth'
import './Navbar.css'

const NAV_ITEMS = [
  { to: '/', label: 'Home' },
  { to: '/assistant', label: 'AI Assistant' },
  { to: '/agents', label: 'Agents' },
  { to: '/projects', label: 'Projects' },
]

// This navbar is only ever rendered on the public marketing routes (see
// PublicLayout). The main nav items above are always the marketing links,
// but the auth actions on the right reflect the actual session: logged-out
// visitors see Log in/Sign up, logged-in visitors see their account menu
// (see NavAccountMenu) — both read from the same AuthProvider session used
// by the rest of the app, so there's no separate "who's logged in" source.
function Navbar() {
  const [isOpen, setIsOpen] = useState(false)
  const { user, isLoading, logout } = useAuth()
  const navigate = useNavigate()

  async function handleLogout() {
    setIsOpen(false)
    await logout()
    navigate('/')
  }

  return (
    <nav className="navbar">
      <Link to="/" className="logo" onClick={() => setIsOpen(false)}>
        AI PROJECT
      </Link>

      <button
        className="nav-toggle"
        aria-label="Toggle navigation menu"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((open) => !open)}
      >
        <span />
        <span />
        <span />
      </button>

      <div className={`nav-links ${isOpen ? 'nav-links-open' : ''}`}>
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) => (isActive ? 'active' : '')}
            onClick={() => setIsOpen(false)}
          >
            {item.label}
          </NavLink>
        ))}

        <div className="nav-auth-actions">
          {isLoading ? null : user ? (
            <NavAccountMenu user={user} onLogout={handleLogout} />
          ) : (
            <>
              <Link to="/login" className="nav-login-link" onClick={() => setIsOpen(false)}>
                Log in
              </Link>
              <Button to="/register" variant="primary" onClick={() => setIsOpen(false)}>
                Sign up
              </Button>
            </>
          )}
        </div>
      </div>
    </nav>
  )
}

export default Navbar
