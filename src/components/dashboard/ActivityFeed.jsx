import Icon from '../icons/Icon'
import './ActivityFeed.css'

const TYPE_ICON_NAMES = {
  project: 'folder',
  agent: 'bot',
  conversation: 'chat',
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
                <Icon name={TYPE_ICON_NAMES[item.type]} fallback="folder" size={14} />
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
