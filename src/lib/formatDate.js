// Old API responses sent "YYYY-MM-DD HH:MM:SS" (UTC, no zone); new ones send
// ISO 8601 with a zone. Vercel and Render deploy separately, so accept both
// until every backend in the wild sends ISO.
const LEGACY_UTC_TEXT = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/

export function parseApiDate(value) {
  if (!value) return null
  const date = new Date(LEGACY_UTC_TEXT.test(value) ? `${value.replace(' ', 'T')}Z` : value)
  return Number.isNaN(date.getTime()) ? null : date
}

export function formatDate(value, options = { dateStyle: 'medium', timeStyle: 'short' }) {
  const date = parseApiDate(value)
  return date ? date.toLocaleString(undefined, options) : null
}
