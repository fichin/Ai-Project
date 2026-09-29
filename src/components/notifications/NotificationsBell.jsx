import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useDismissableLayer } from '../../hooks/useDismissableLayer'
import Icon from '../icons/Icon'
import {
  fetchNotifications,
  fetchUnreadNotificationsCount,
  markNotificationReadRequest,
  markAllNotificationsReadRequest,
} from './notificationsApi'
import './NotificationsBell.css'

const POLL_INTERVAL_MS = 30000
const LIST_LIMIT = 30

const NOTIFICATIONS_LIST_KEY = ['notifications', 'list', LIST_LIMIT]
const UNREAD_COUNT_KEY = ['notifications', 'unread-count']

const ICON_NAMES = { project: 'folder', agent: 'bot' }

function iconCategory(type) {
  return type.startsWith('agent_') ? 'agent' : 'project'
}

// Where clicking a notification should go. Projects have their own detail
// route, so entries always deep-link there (ProjectDetails already renders a
// friendly "not found" state if the project was since deleted). Agents have
// no detail route — reuse the exact same list+presetSearch pattern
// CommandPalette uses for its agent search results (see commands.js /
// Agents.jsx), rather than inventing a new navigation convention.
function resolveNotificationTarget(item) {
  if (item.entityType === 'project' && item.entityId) {
    return { path: `/projects/${item.entityId}` }
  }
  if (item.entityType === 'agent') {
    return { path: '/agents', state: item.entityName ? { presetSearch: item.entityName } : undefined }
  }
  return null
}

// Notification bell for the authenticated topbar. Conceptually distinct from
// ActivityDrawer (a full event history): this is a short list of items that
// still need the user's attention, with an unread badge polled in the
// background regardless of whether the dropdown is open.
function NotificationsBell() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [isOpen, setIsOpen] = useState(false)
  // Surfaces a mark-all-read failure in the same error+Retry slot the list
  // query's own error uses (the pre-migration code shared one `error` state
  // between the two) without conflating the two sources.
  const [mutationError, setMutationError] = useState(null)
  const containerRef = useRef(null)

  // Polls in the background regardless of whether the dropdown is open —
  // `refetchInterval` reproduces the original's unconditional
  // `setInterval`, but without the hand-rolled cancelled-flag cleanup
  // useQuery already handles unmount for us.
  const { data: unreadCountData } = useQuery({
    queryKey: UNREAD_COUNT_KEY,
    queryFn: ({ signal }) => fetchUnreadNotificationsCount({ signal }),
    refetchInterval: POLL_INTERVAL_MS,
  })
  const unreadCount = unreadCountData?.count ?? 0

  // Only fetched while the dropdown is open — `enabled: isOpen` reproduces
  // the original's isOpen-gated effect, so no list request stays warm while
  // the bell is closed.
  const {
    data: items = [],
    isLoading,
    isFetching,
    error,
    refetch: loadNotifications,
  } = useQuery({
    queryKey: NOTIFICATIONS_LIST_KEY,
    queryFn: ({ signal }) => fetchNotifications(LIST_LIMIT, { signal }),
    enabled: isOpen,
  })
  const listError = error?.message ?? null
  const displayError = listError ?? mutationError
  // Once a load has failed, `status` (and therefore `error`) stays "error"
  // for the duration of a manual retry — only `isFetching` flips true — so
  // this shows the loading skeleton (rather than a stale error/empty flash)
  // while retrying, same reasoning as Projects/Agents/Dashboard.
  const isShowingLoadingState = isLoading || (Boolean(listError) && isFetching)

  // Escape-to-close and click-outside-to-close are shared with
  // NavAccountMenu via useDismissableLayer — this is a lightweight popover
  // (aria-modal="false" below), not a true modal dialog, so it intentionally
  // doesn't get the hook's focus-trap behavior (no dialogRef passed).
  useDismissableLayer({ isOpen, onDismiss: () => setIsOpen(false), containerRef })

  const markReadMutation = useMutation({
    mutationFn: (id) => markNotificationReadRequest(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: NOTIFICATIONS_LIST_KEY })
      await queryClient.cancelQueries({ queryKey: UNREAD_COUNT_KEY })
      queryClient.setQueryData(NOTIFICATIONS_LIST_KEY, (prev) =>
        (prev ?? []).map((item) => (item.id === id ? { ...item, isRead: true } : item)),
      )
      queryClient.setQueryData(UNREAD_COUNT_KEY, (prev) => ({ count: Math.max(0, (prev?.count ?? 0) - 1) }))
    },
    onError: () => {
      // Re-sync with the server rather than guessing what the true state is
      // — same reasoning as before the migration.
      queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_LIST_KEY })
      queryClient.invalidateQueries({ queryKey: UNREAD_COUNT_KEY })
    },
  })

  const markAllReadMutation = useMutation({
    mutationFn: () => markAllNotificationsReadRequest(),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: NOTIFICATIONS_LIST_KEY })
      await queryClient.cancelQueries({ queryKey: UNREAD_COUNT_KEY })
      const previousItems = queryClient.getQueryData(NOTIFICATIONS_LIST_KEY)
      const previousCount = queryClient.getQueryData(UNREAD_COUNT_KEY)
      queryClient.setQueryData(NOTIFICATIONS_LIST_KEY, (prev) =>
        (prev ?? []).map((item) => ({ ...item, isRead: true })),
      )
      queryClient.setQueryData(UNREAD_COUNT_KEY, { count: 0 })
      return { previousItems, previousCount }
    },
    onError: (err, _variables, context) => {
      if (context) {
        queryClient.setQueryData(NOTIFICATIONS_LIST_KEY, context.previousItems)
        queryClient.setQueryData(UNREAD_COUNT_KEY, context.previousCount)
      }
      setMutationError(err.message)
    },
  })

  function handleToggleOpen() {
    setIsOpen((open) => {
      const next = !open
      if (next) setMutationError(null)
      return next
    })
  }

  function handleMarkRead(id) {
    markReadMutation.mutate(id)
  }

  function handleNotificationClick(item) {
    if (!item.isRead) handleMarkRead(item.id)

    const target = resolveNotificationTarget(item)
    setIsOpen(false)
    if (target) navigate(target.path, target.state ? { state: target.state } : undefined)
  }

  function handleMarkAllRead() {
    if (unreadCount === 0) return
    markAllReadMutation.mutate()
  }

  function handleRetry() {
    setMutationError(null)
    loadNotifications()
  }

  return (
    <div className="notifications-bell" ref={containerRef}>
      <button
        type="button"
        className="app-topbar-icon-btn notifications-bell-trigger"
        onClick={handleToggleOpen}
        aria-haspopup="true"
        aria-expanded={isOpen}
        aria-label={unreadCount > 0 ? `Open notifications, ${unreadCount} unread` : 'Open notifications'}
        title="Notifications"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unreadCount > 0 && (
          <span className="notifications-bell-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
        )}
      </button>

      {isOpen && (
        <div className="notifications-dropdown" role="dialog" aria-modal="false" aria-label="Notifications">
          <div className="notifications-dropdown-header">
            <h2>Notifications</h2>
            <button
              type="button"
              className="notifications-dropdown-mark-all"
              onClick={handleMarkAllRead}
              disabled={unreadCount === 0}
            >
              Mark all as read
            </button>
          </div>

          <div className="notifications-dropdown-body">
            {isShowingLoadingState ? (
              <div className="notifications-dropdown-list">
                {[0, 1, 2, 3].map((key) => (
                  <div key={key} className="notifications-dropdown-skeleton" />
                ))}
              </div>
            ) : displayError ? (
              <div className="notifications-dropdown-status">
                <p>{displayError}</p>
                <button type="button" className="notifications-dropdown-retry" onClick={handleRetry}>
                  Try again
                </button>
              </div>
            ) : items.length === 0 ? (
              <div className="notifications-dropdown-status">
                <p>You're all caught up. New updates about your projects and agents will show up here.</p>
              </div>
            ) : (
              <div className="notifications-dropdown-list">
                {items.map((item) => {
                  const category = iconCategory(item.type)
                  const rowContent = (
                    <>
                      <span className={`notifications-row-dot ${item.isRead ? 'notifications-row-dot-read' : ''}`} />
                      <span className={`notifications-row-icon notifications-row-icon-${category}`}>
                        <Icon name={ICON_NAMES[category]} size={14} />
                      </span>
                      <span className="notifications-row-info">
                        <span className="notifications-row-message">{item.message}</span>
                        <span className="notifications-row-time">{item.relativeTime}</span>
                      </span>
                    </>
                  )

                  return (
                    <button
                      key={item.id}
                      type="button"
                      className={`notifications-row ${item.isRead ? 'notifications-row-read' : 'notifications-row-unread'}`}
                      onClick={() => handleNotificationClick(item)}
                    >
                      {rowContent}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default NotificationsBell
