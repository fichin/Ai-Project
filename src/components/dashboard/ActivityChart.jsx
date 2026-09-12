import './ActivityChart.css'

const WIDTH = 640
const HEIGHT = 200

// Catmull-Rom-style smoothing so the trend reads as a considered curve
// rather than a jagged day-to-day zigzag.
function smoothPath(coords) {
  if (coords.length < 3) {
    return coords.map(([x, y], index) => `${index === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ')
  }

  let path = `M${coords[0][0].toFixed(1)},${coords[0][1].toFixed(1)}`
  for (let i = 0; i < coords.length - 1; i += 1) {
    const [x0, y0] = coords[i === 0 ? i : i - 1]
    const [x1, y1] = coords[i]
    const [x2, y2] = coords[i + 1]
    const [x3, y3] = coords[i + 2 < coords.length ? i + 2 : i + 1]
    const cp1x = x1 + (x2 - x0) / 6
    const cp1y = y1 + (y2 - y0) / 6
    const cp2x = x2 - (x3 - x1) / 6
    const cp2y = y2 - (y3 - y1) / 6
    path += ` C${cp1x.toFixed(1)},${cp1y.toFixed(1)} ${cp2x.toFixed(1)},${cp2y.toFixed(1)} ${x2.toFixed(1)},${y2.toFixed(1)}`
  }
  return path
}

function buildPaths(points) {
  const max = Math.max(1, ...points.map((point) => point.count))
  const stepX = WIDTH / Math.max(points.length - 1, 1)

  const coords = points.map((point, index) => {
    const x = index * stepX
    const y = HEIGHT - (point.count / max) * (HEIGHT - 8) - 4
    return [x, y]
  })

  const line = smoothPath(coords)
  const area = `${line} L${WIDTH.toFixed(1)},${HEIGHT.toFixed(1)} L0,${HEIGHT.toFixed(1)} Z`

  return { line, area }
}

function formatShortDate(iso) {
  const date = new Date(`${iso}T00:00:00Z`)
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', timeZone: 'UTC' })
}

function ActivityChart({ data, isLoading }) {
  const points = data ?? []
  const total = points.reduce((sum, point) => sum + point.count, 0)
  const hasActivity = total > 0
  const { line, area } = hasActivity ? buildPaths(points) : { line: '', area: '' }

  return (
    <div className="activity-chart-card">
      <div className="activity-chart-header">
        <div>
          <h2>AI Activity</h2>
          <p>Messages exchanged across your workspace, last 14 days.</p>
        </div>
        {!isLoading && (
          <div className="activity-chart-total">
            <span className="activity-chart-total-value">{total.toLocaleString()}</span>
            <span className="activity-chart-total-label">messages</span>
          </div>
        )}
      </div>

      <div className="activity-chart-body">
        {isLoading ? (
          <div className="activity-chart-skeleton" />
        ) : !hasActivity ? (
          <div className="activity-chart-empty">
            <p>No AI activity yet. Start a conversation to see your usage trend here.</p>
          </div>
        ) : (
          <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} preserveAspectRatio="none" className="activity-chart-svg">
            <defs>
              <linearGradient id="activityAreaGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#5b8cff" stopOpacity="0.35" />
                <stop offset="100%" stopColor="#5b8cff" stopOpacity="0" />
              </linearGradient>
              <linearGradient id="activityStrokeGradient" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#5b8cff" />
                <stop offset="100%" stopColor="#22d3ee" />
              </linearGradient>
            </defs>
            <path d={area} fill="url(#activityAreaGradient)" stroke="none" />
            <path
              d={line}
              fill="none"
              stroke="url(#activityStrokeGradient)"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </div>

      {hasActivity && (
        <div className="activity-chart-axis">
          <span>{formatShortDate(points[0].date)}</span>
          <span>{formatShortDate(points[points.length - 1].date)}</span>
        </div>
      )}
    </div>
  )
}

export default ActivityChart
