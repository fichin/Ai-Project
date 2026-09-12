import './ActivityFeed.css'

const TYPE_ICONS = {
  project: <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z" />,
  agent: (
    <>
      <rect x="3" y="11" width="18" height="10" rx="2" />
      <path d="M12 11V7M8 7h8M9 16h.01M15 16h.01" />
    </>
  ),
  conversation: <path d="M21 11.5a8.5 8.5 0 0 1-8.5 8.5H3l2.4-4.2A8.5 8.5 0 1 1 21 11.5Z" />,
}

function ActivityFeed({ items, isLoading }) {
  return (
    <div className="activity-feed">
      <h2 className="activity-feed-title">Recent Activity</h2>

      {isLoading ? (
        <div className="activity-feed-list">
          {[0, 1, 2, 3].map((key) => (
            <div key={key} className="activity-feed-skeleton" />
          ))}
        </div>
      ) : !items || items.length === 0 ? (
        <div className="activity-feed-empty">
          <p>No activity yet. Actions across your workspace will show up here.</p>
        </div>
      ) : (
        <div className="activity-feed-list">
          {items.map((item) => (
            <div key={item.id} className="activity-feed-row">
              <div className={`activity-feed-icon activity-feed-icon-${item.type}`}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  {TYPE_ICONS[item.type] ?? TYPE_ICONS.project}
                </svg>
              </div>
              <div className="activity-feed-info">
                <div className="activity-feed-text">
                  <strong>{item.title}</strong> &mdash; {item.subtitle}
                </div>
                <div className="activity-feed-time">{item.relativeTime}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default ActivityFeed
