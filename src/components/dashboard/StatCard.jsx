import './StatCard.css'

const ICONS = {
  chat: <path d="M21 11.5a8.5 8.5 0 0 1-8.5 8.5H3l2.4-4.2A8.5 8.5 0 1 1 21 11.5Z" />,
  folder: <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z" />,
  bot: (
    <>
      <rect x="3" y="11" width="18" height="10" rx="2" />
      <path d="M12 11V7M8 7h8M9 16h.01M15 16h.01" />
    </>
  ),
  spark: <path d="M12 2l1.8 5.2L19 9l-5.2 1.8L12 16l-1.8-5.2L5 9l5.2-1.8L12 2Z" />,
}

function StatCard({ label, value, secondary, trendPct, icon, isLoading }) {
  const showTrend = typeof trendPct === 'number'
  const isUp = showTrend && trendPct >= 0

  return (
    <div className="stat-card">
      <div className="stat-card-top">
        <div className="stat-card-icon">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            {ICONS[icon] ?? ICONS.spark}
          </svg>
        </div>
        {showTrend && (
          <span className={`stat-card-trend ${isUp ? 'up' : 'down'}`}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
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
