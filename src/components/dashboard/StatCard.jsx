import Icon from '../icons/Icon'
import './StatCard.css'

function StatCard({ label, value, secondary, trendPct, icon, isLoading }) {
  const showTrend = typeof trendPct === 'number'
  const isUp = showTrend && trendPct >= 0

  return (
    <div className="stat-card">
      <div className="stat-card-top">
        <div className="stat-card-icon">
          <Icon name={icon} fallback="spark" size={18} />
        </div>
        {showTrend && (
          <span className={`stat-card-trend ${isUp ? 'up' : 'down'}`}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden="true">
              {isUp ? <path d="M6 15l6-6 6 6" /> : <path d="M6 9l6 6 6-6" />}
            </svg>
            {Math.abs(trendPct)}%
          </span>
        )}
      </div>

      <div className="stat-card-value">
        {isLoading ? <span className="stat-skeleton" /> : (value ?? 0).toLocaleString()}
      </div>
      <div className="stat-card-label">{label}</div>
      {secondary && !isLoading && <div className="stat-card-secondary">{secondary}</div>}
    </div>
  )
}

export default StatCard
