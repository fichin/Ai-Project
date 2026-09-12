// SQLite's datetime('now') returns UTC timestamps like "2026-09-08 14:06:39"
// (no offset). Treat them explicitly as UTC to avoid local-timezone drift.
function toUtcDate(sqliteTimestamp) {
  return new Date(`${sqliteTimestamp.replace(' ', 'T')}Z`)
}

function pluralize(value, unit) {
  return `${value} ${unit}${value === 1 ? '' : 's'} ago`
}

export function formatRelativeTime(sqliteTimestamp) {
  const diffMs = Date.now() - toUtcDate(sqliteTimestamp).getTime()
  const diffSec = Math.round(diffMs / 1000)

  if (diffSec < 60) return 'Just now'

  const diffMin = Math.round(diffSec / 60)
  if (diffMin < 60) return pluralize(diffMin, 'minute')

  const diffHour = Math.round(diffMin / 60)
  if (diffHour < 24) return pluralize(diffHour, 'hour')

  const diffDay = Math.round(diffHour / 24)
  if (diffDay < 7) return pluralize(diffDay, 'day')

  const diffWeek = Math.round(diffDay / 7)
  if (diffWeek < 5) return pluralize(diffWeek, 'week')

  const diffMonth = Math.round(diffDay / 30)
  if (diffMonth < 12) return pluralize(diffMonth, 'month')

  return pluralize(Math.round(diffDay / 365), 'year')
}
