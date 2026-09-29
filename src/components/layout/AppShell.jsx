import { useEffect, useState } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import AppSidebar from './AppSidebar'
import CommandPalette from '../command/CommandPalette'
import ActivityDrawer from '../activity/ActivityDrawer'
import NotificationsBell from '../notifications/NotificationsBell'
import ChillRunnerModal from '../game/ChillRunnerModal'
import Icon from '../icons/Icon'
import { useAuth } from '../../context/useAuth'
import { usePreferences } from '../../context/usePreferences'
import './AppShell.css'

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform ?? navigator.userAgent ?? '')

function AppShell() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false)
  const [isActivityOpen, setIsActivityOpen] = useState(false)
  const [isChillRunnerOpen, setIsChillRunnerOpen] = useState(false)
  const { logout } = useAuth()
  const { preferences, updatePreferences } = usePreferences()
  const navigate = useNavigate()

  async function handleLogout() {
    setIsSidebarOpen(false)
    await logout()
    navigate('/')
  }

  function handleToggleCollapse() {
    updatePreferences({ sidebarCollapsed: !preferences.sidebarCollapsed }).catch(() => {
      // Non-critical UI preference — a failed save just means it reverts to
      // the previous state (handled inside PreferencesProvider) and the user
      // can try again; no need to interrupt them with an error dialog here.
    })
  }

  // Ctrl+K / Cmd+K anywhere in the authenticated app opens the command
  // palette — this effect only ever runs while AppShell (i.e. a protected
  // route) is mounted, so the public Home page is unaffected by design.
  useEffect(() => {
    function handleKeyDown(event) {
      const isShortcut = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k'
      if (isShortcut) {
        event.preventDefault()
        setIsCommandPaletteOpen((open) => !open)
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  return (
    <div className="app-shell">
      <AppSidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        isCollapsed={preferences.sidebarCollapsed}
        onToggleCollapse={handleToggleCollapse}
        onLogout={handleLogout}
      />
      {isSidebarOpen && <div className="app-shell-overlay" onClick={() => setIsSidebarOpen(false)} />}

      <div className="app-main">
        <header className="app-topbar">
          <button
            className="app-topbar-toggle"
            aria-label="Open navigation menu"
            onClick={() => setIsSidebarOpen(true)}
          >
            <Icon name="menu" size={20} />
          </button>
          <span className="app-topbar-logo">AI PROJECT</span>

          <div className="app-topbar-spacer" />

          <button
            type="button"
            className="app-topbar-command-trigger"
            onClick={() => setIsCommandPaletteOpen(true)}
            aria-label="Open command palette"
          >
            <Icon name="search" size={15} />
            <span className="app-topbar-command-label">Search...</span>
            <kbd className="app-topbar-command-kbd">{isMac ? '⌘K' : 'Ctrl K'}</kbd>
          </button>

          <button
            type="button"
            className="app-topbar-chill-trigger"
            onClick={() => setIsChillRunnerOpen(true)}
            aria-label="Play SideQuest"
            title="Take a quick side quest while your agent works."
          >
            <span aria-hidden="true">🎮</span>
            <span className="app-topbar-chill-label">SideQuest</span>
          </button>

          <button
            type="button"
            className="app-topbar-icon-btn"
            onClick={() => setIsActivityOpen(true)}
            aria-label="Open activity"
            title="Activity"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M12 8v4l3 3" />
              <circle cx="12" cy="12" r="9" />
            </svg>
          </button>

          <NotificationsBell />
        </header>

        <div className="app-content">
          <Outlet />
        </div>
      </div>

      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        onToggleSidebar={handleToggleCollapse}
        onOpenActivity={() => setIsActivityOpen(true)}
        onLogout={handleLogout}
      />
      <ActivityDrawer isOpen={isActivityOpen} onClose={() => setIsActivityOpen(false)} />
      {isChillRunnerOpen && <ChillRunnerModal onClose={() => setIsChillRunnerOpen(false)} />}
    </div>
  )
}

export default AppShell
