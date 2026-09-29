import { getPostgresPool, NOW_UTC_SQL } from './postgresClient.js'
import { DEFAULT_PREFERENCES } from '../config/preferences.js'

// sidebar_collapsed/reduced_motion are real BOOLEAN columns in Postgres
// (were INTEGER 0/1 in SQLite) — `pg` already returns/accepts native JS
// booleans for them, so the old Boolean(...)/`? 1 : 0` conversions are
// gone; the values pass straight through.
function toPreferences(row) {
  if (!row) return { ...DEFAULT_PREFERENCES }
  return {
    theme: row.theme,
    accent: row.accent,
    density: row.density,
    sidebarCollapsed: row.sidebar_collapsed,
    defaultLandingPage: row.default_landing_page,
    reducedMotion: row.reduced_motion,
  }
}

export async function getPreferencesForUser(userId) {
  const { rows } = await getPostgresPool().query('SELECT * FROM user_preferences WHERE user_id = $1', [userId])
  return toPreferences(rows[0])
}

// Upsert with a merge against current values (falling back to defaults for a
// user who has no row yet) — same partial-update pattern as
// projectsRepository/agentsRepository/usersRepository.
export async function updatePreferencesForUser(userId, fields) {
  const current = await getPreferencesForUser(userId)
  const merged = { ...current, ...fields }

  await getPostgresPool().query(
    `INSERT INTO user_preferences
       (user_id, theme, accent, density, sidebar_collapsed, default_landing_page, reduced_motion, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, ${NOW_UTC_SQL})
     ON CONFLICT (user_id) DO UPDATE SET
       theme = excluded.theme,
       accent = excluded.accent,
       density = excluded.density,
       sidebar_collapsed = excluded.sidebar_collapsed,
       default_landing_page = excluded.default_landing_page,
       reduced_motion = excluded.reduced_motion,
       updated_at = excluded.updated_at`,
    [
      userId,
      merged.theme,
      merged.accent,
      merged.density,
      merged.sidebarCollapsed,
      merged.defaultLandingPage,
      merged.reducedMotion,
    ],
  )

  return merged
}
