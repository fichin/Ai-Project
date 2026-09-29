import { useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useDismissableLayer } from '../../hooks/useDismissableLayer'
import Icon from '../icons/Icon'
import { fetchActivity } from './activityApi'
import './ActivityDrawer.css'

const ACTIVITY_LIMIT = 50
const ACTIVITY_QUERY_KEY = ['activity']

const ICON_NAMES = {
  project: 'folder',
  agent: 'bot',
  profile: 'profile',
  preferences: 'settings',
}

function iconCategory(type) {
  if (type.startsWith('project_')) return 'project'
  if (type.startsWith('agent_')) return 'agent'
  if (type === 'profile_updated') return 'profile'
  if (type === 'preferences_updated') return 'preferences'
  return 'project'
}

// Fuller sibling of the Dashboard's small ActivityFeed widget — same real
// activity_events data (via GET /api/activity), just more of it and in a
// dedicated, scrollable panel reachable from anywhere in the authenticated
// shell (see AppShell's topbar trigger).
function ActivityDrawer({ isOpen, onClose }) {
  const dialogRef = useRef(null)

  // Escape-to-close plus the focus trap/restore are shared with every other
  // dialog-shaped overlay via useDismissableLayer — see that file for why
  // CommandPalette is the one exception.
  useDismissableLayer({ isOpen, onDismiss: onClose, dialogRef })

  // Only fetched while open (`enabled: isOpen`), so no request stays warm
  // while the drawer is closed. Retries are disabled app-wide (see
  // lib/queryClient.js) and there's no explicit Retry button — closing and
  // reopening re-fetches since the query is marked stale by default.
  //
  // Uses `isFetching` rather than `isLoading` on purpose: the original
  // reset to its loading skeleton on every open, not just the first.
  // `isLoading` would instead keep showing stale items during a reopen's
  // background refetch, which isn't the behavior being preserved here.
  const {
    data: items = [],
    isFetching,
    error,
  } = useQuery({
    queryKey: ACTIVITY_QUERY_KEY,
    queryFn: ({ signal }) => fetchActivity(ACTIVITY_LIMIT, { signal }),
    enabled: isOpen,
  })
  const loadError = error?.message ?? null

  if (!isOpen) return null

  return (
    <div className="activity-drawer-overlay" onClick={onClose}>
      <aside
        ref={dialogRef}
        className="activity-drawer-panel"
        role="dialog"
        aria-modal="true"
        aria-label="Activity"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="activity-drawer-header">
          <h2>Activity</h2>
          <button className="activity-drawer-close" aria-label="Close activity panel" onClick={onClose}>
            <Icon name="close" size={16} />
          </button>
        </div>

        <div className="activity-drawer-body">
          {isFetching ? (
            <div className="activity-drawer-list">
              {[0, 1, 2, 3, 4].map((key) => (
                <div key={key} className="activity-drawer-skeleton" />
              ))}
            </div>
          ) : loadError ? (
            <div className="activity-drawer-status">
              <p>{loadError}</p>
            </div>
          ) : items.length === 0 ? (
            <div className="activity-drawer-status">
              <p>No activity yet. Actions across your workspace will show up here.</p>
            </div>
          ) : (
            <div className="activity-drawer-list">
              {items.map((item) => (
                <div key={item.id} className="activity-drawer-row">
                  <div className={`activity-drawer-icon activity-drawer-icon-${iconCategory(item.type)}`}>
                    <Icon name={ICON_NAMES[iconCategory(item.type)]} size={14} />
                  </div>
                  <div className="activity-drawer-info">
                    <div className="activity-drawer-message">{item.message}</div>
                    <div className="activity-drawer-time">{item.relativeTime}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </aside>
    </div>
  )
}

export default ActivityDrawer
