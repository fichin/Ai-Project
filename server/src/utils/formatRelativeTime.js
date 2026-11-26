function pluralize(value, unit) {
  return `${value} ${unit}${value === 1 ? '' : 's'} ago`
}

// Takes the Date that pg returns for a timestamptz column.
export function formatRelativeTime(date) {
  const diffMs = Date.now() - date.getTime()
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
