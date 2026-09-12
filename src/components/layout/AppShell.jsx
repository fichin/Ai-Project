import { useState } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import AppSidebar from './AppSidebar'
import { useAuth } from '../../context/useAuth'
import './AppShell.css'

function AppShell() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const { logout } = useAuth()
  const navigate = useNavigate()

  async function handleLogout() {
    setIsSidebarOpen(false)
    await logout()
    navigate('/')
  }

  return (
    <div className="app-shell">
      <AppSidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} onLogout={handleLogout} />
      {isSidebarOpen && <div className="app-shell-overlay" onClick={() => setIsSidebarOpen(false)} />}

      <div className="app-main">
        <header className="app-topbar">
          <button
            className="app-topbar-toggle"
            aria-label="Open navigation menu"
            onClick={() => setIsSidebarOpen(true)}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <span className="app-topbar-logo">AI PROJECT</span>
        </header>

        <div className="app-content">
          <Outlet />
        </div>
      </div>
    </div>
  )
}

export default AppShell
