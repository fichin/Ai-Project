import { getDb } from './index.js'

function normalizeTrend(row) {
  const total = row.total ?? 0
  const last7Days = row.last7 ?? 0
  const prev7Days = row.prev7 ?? 0

  // A percentage change against a near-empty baseline (e.g. 1 -> 3) reads as
  // false precision, so we only report a trend once there's a real previous
  // week to compare against. The UI shows a "New" badge instead when null.
  const trendPct = prev7Days > 0 ? Math.round(((last7Days - prev7Days) / prev7Days) * 100) : null

  return { total, last7Days, trendPct }
}

export function getStatsForUser(userId) {
  const db = getDb()

  const conversationRow = db
    .prepare(
      `SELECT
         COUNT(*) AS total,
         SUM(CASE WHEN created_at >= datetime('now', '-7 days') THEN 1 ELSE 0 END) AS last7,
         SUM(CASE WHEN created_at >= datetime('now', '-14 days') AND created_at < datetime('now', '-7 days') THEN 1 ELSE 0 END) AS prev7
       FROM conversations WHERE user_id = ?`,
    )
    .get(userId)

  const messageRow = db
    .prepare(
      `SELECT
         COUNT(*) AS total,
         SUM(CASE WHEN m.created_at >= datetime('now', '-7 days') THEN 1 ELSE 0 END) AS last7,
         SUM(CASE WHEN m.created_at >= datetime('now', '-14 days') AND m.created_at < datetime('now', '-7 days') THEN 1 ELSE 0 END) AS prev7
       FROM messages m
       JOIN conversations c ON c.id = m.conversation_id
       WHERE c.user_id = ?`,
    )
    .get(userId)

  const projectRow = db
    .prepare(
      `SELECT COUNT(*) AS total, SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) AS active
       FROM projects WHERE user_id = ?`,
    )
    .get(userId)

  const agentRow = db
    .prepare(
      `SELECT COUNT(*) AS total, SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) AS active
       FROM agents WHERE user_id = ?`,
    )
    .get(userId)

  return {
    conversations: normalizeTrend(conversationRow),
    messages: normalizeTrend(messageRow),
    projects: { total: projectRow.total ?? 0, active: projectRow.active ?? 0 },
    agents: { total: agentRow.total ?? 0, active: agentRow.active ?? 0 },
  }
}

// Real per-day message counts for the current user, zero-filled so the chart
// always renders a continuous series even on days with no activity.
export function getUsageSeries(userId, days = 14) {
  const db = getDb()
  const rows = db
    .prepare(
      `SELECT date(m.created_at) AS day, COUNT(*) AS count
       FROM messages m
       JOIN conversations c ON c.id = m.conversation_id
       WHERE c.user_id = ? AND m.created_at >= datetime('now', ?)
       GROUP BY day
       ORDER BY day ASC`,
    )
    .all(userId, `-${days - 1} days`)

  const byDay = new Map(rows.map((row) => [row.day, row.count]))
  const series = []
  for (let i = days - 1; i >= 0; i -= 1) {
    const date = new Date()
    date.setUTCDate(date.getUTCDate() - i)
    const key = date.toISOString().slice(0, 10)
    series.push({ date: key, count: byDay.get(key) ?? 0 })
  }
  return series
}

export function getAgentActivity(userId, limit = 6) {
  return getDb()
    .prepare(
      `SELECT a.id, a.name, a.status, a.updated_at, a.project_id, p.name AS project_name,
              COUNT(DISTINCT c.id) AS conversation_count
       FROM agents a
       LEFT JOIN projects p ON p.id = a.project_id
       LEFT JOIN conversations c ON c.agent_id = a.id
       WHERE a.user_id = ?
       GROUP BY a.id
       ORDER BY a.updated_at DESC
       LIMIT ?`,
    )
    .all(userId, limit)
}

// A merged, honest activity feed built from the timestamps already on
// projects/agents/conversations — no separate audit-log table exists (or is
// needed) just for the dashboard.
export function getRecentActivity(userId, limit = 8) {
  return getDb()
    .prepare(
      `SELECT * FROM (
         SELECT id, 'project' AS entity, name AS title, status AS detail, created_at, updated_at,
                CASE WHEN created_at = updated_at THEN 'created' ELSE 'updated' END AS action
         FROM projects WHERE user_id = ?
         UNION ALL
         SELECT id, 'agent' AS entity, name AS title, status AS detail, created_at, updated_at,
                CASE WHEN created_at = updated_at THEN 'created' ELSE 'updated' END AS action
         FROM agents WHERE user_id = ?
         UNION ALL
         SELECT id, 'conversation' AS entity, COALESCE(title, 'New conversation') AS title, NULL AS detail,
                created_at, updated_at, 'started' AS action
         FROM conversations WHERE user_id = ?
       )
       ORDER BY updated_at DESC
       LIMIT ?`,
    )
    .all(userId, userId, userId, limit)
}
