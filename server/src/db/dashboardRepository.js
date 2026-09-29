import { getPostgresPool, utcTextDaysAgo } from './postgresClient.js'

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

// SUM(CASE WHEN ... THEN 1 ELSE 0 END) is a bigint in Postgres too (same as
// COUNT), returned as a string by `pg` by default — every aggregate below
// is cast to ::int. SUM over zero matching rows is SQL NULL (true in both
// SQLite and Postgres), which the `row.last7 ?? 0` fallbacks below already
// handled before this migration and still do — casting NULL::int is still
// NULL, so that fallback keeps working unchanged.
export async function getStatsForUser(userId) {
  const pool = getPostgresPool()
  const sevenDaysAgo = utcTextDaysAgo(7)
  const fourteenDaysAgo = utcTextDaysAgo(14)

  const {
    rows: [conversationRow],
  } = await pool.query(
    `SELECT
       COUNT(*)::int AS total,
       SUM(CASE WHEN created_at >= $2 THEN 1 ELSE 0 END)::int AS last7,
       SUM(CASE WHEN created_at >= $3 AND created_at < $2 THEN 1 ELSE 0 END)::int AS prev7
     FROM conversations WHERE user_id = $1`,
    [userId, sevenDaysAgo, fourteenDaysAgo],
  )

  const {
    rows: [messageRow],
  } = await pool.query(
    `SELECT
       COUNT(*)::int AS total,
       SUM(CASE WHEN m.created_at >= $2 THEN 1 ELSE 0 END)::int AS last7,
       SUM(CASE WHEN m.created_at >= $3 AND m.created_at < $2 THEN 1 ELSE 0 END)::int AS prev7
     FROM messages m
     JOIN conversations c ON c.id = m.conversation_id
     WHERE c.user_id = $1`,
    [userId, sevenDaysAgo, fourteenDaysAgo],
  )

  const {
    rows: [projectRow],
  } = await pool.query(
    `SELECT COUNT(*)::int AS total, SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END)::int AS active
     FROM projects WHERE user_id = $1`,
    [userId],
  )

  const {
    rows: [agentRow],
  } = await pool.query(
    `SELECT COUNT(*)::int AS total, SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END)::int AS active
     FROM agents WHERE user_id = $1`,
    [userId],
  )

  return {
    conversations: normalizeTrend(conversationRow),
    messages: normalizeTrend(messageRow),
    projects: { total: projectRow.total ?? 0, active: projectRow.active ?? 0 },
    agents: { total: agentRow.total ?? 0, active: agentRow.active ?? 0 },
  }
}

// Real per-day message counts for the current user, zero-filled so the chart
// always renders a continuous series even on days with no activity.
export async function getUsageSeries(userId, days = 14) {
  const pool = getPostgresPool()
  const boundary = utcTextDaysAgo(days - 1)

  // created_at is TEXT ("YYYY-MM-DD HH:MM:SS"), not a native timestamp, so
  // SQLite's date() (which parses and reformats it) doesn't apply — the
  // first 10 characters of that fixed-width format are always the date
  // portion, so a plain substring reproduces it without any parsing at all.
  const { rows } = await pool.query(
    `SELECT LEFT(m.created_at, 10) AS day, COUNT(*)::int AS count
     FROM messages m
     JOIN conversations c ON c.id = m.conversation_id
     WHERE c.user_id = $1 AND m.created_at >= $2
     GROUP BY day
     ORDER BY day ASC`,
    [userId, boundary],
  )

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

export async function getAgentActivity(userId, limit = 6) {
  // GROUP BY a.id alone (as SQLite allowed) isn't valid in Postgres once
  // p.name — from the joined projects table — is selected: Postgres only
  // waives the "every selected column must be grouped" rule for columns
  // functionally dependent on a grouped primary key from the *same* table,
  // not across a join. p.name is single-valued per agent regardless (each
  // agent has at most one project), so adding it to GROUP BY changes
  // nothing about the result, only satisfies Postgres's stricter check.
  const { rows } = await getPostgresPool().query(
    `SELECT a.id, a.name, a.status, a.updated_at, a.project_id, p.name AS project_name,
            COUNT(DISTINCT c.id)::int AS conversation_count
     FROM agents a
     LEFT JOIN projects p ON p.id = a.project_id
     LEFT JOIN conversations c ON c.agent_id = a.id
     WHERE a.user_id = $1
     GROUP BY a.id, p.name
     ORDER BY a.updated_at DESC
     LIMIT $2`,
    [userId, limit],
  )
  return rows
}

// A merged activity feed: real logged events (activity_events — the only
// source that can still show a deletion, since a deleted project/agent row
// no longer exists to derive an entry from) plus conversations, which have
// no event type of their own yet and are still derived from their own
// timestamp. entity_name is a snapshot taken at event time, so this reads
// correctly even for since-deleted projects/agents.
export async function getRecentActivity(userId, limit = 8) {
  // Postgres requires a derived table in FROM to be aliased (unlike
  // SQLite, which allowed the bare subquery) — "combined" added below,
  // nothing else about the query's shape changed.
  const { rows } = await getPostgresPool().query(
    `SELECT * FROM (
       SELECT id, type AS action_type, entity_name AS title, created_at AS timestamp
       FROM activity_events WHERE user_id = $1
       UNION ALL
       SELECT id, 'conversation_started' AS action_type, COALESCE(title, 'New conversation') AS title,
              updated_at AS timestamp
       FROM conversations WHERE user_id = $2
     ) AS combined
     ORDER BY timestamp DESC
     LIMIT $3`,
    [userId, userId, limit],
  )
  return rows
}
