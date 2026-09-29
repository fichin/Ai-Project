// The app's schema, applied to Postgres/Supabase — see postgresClient.js
// for the connection every repository queries through.
//
// This was translated from the project's original SQLite schema over the
// course of the migration; kept here for reference, the translations
// applied were:
//  - `INTEGER PRIMARY KEY AUTOINCREMENT` -> `INTEGER GENERATED ALWAYS AS
//    IDENTITY PRIMARY KEY` (the modern Postgres identity-column syntax;
//    nothing in the app ever inserts an explicit id, so ALWAYS rather than
//    BY DEFAULT is fine).
//  - `INTEGER ... CHECK (col IN (0, 1))` boolean flags (user_preferences'
//    sidebar_collapsed/reduced_motion) -> real `BOOLEAN` columns.
//  - Timestamp columns stay `TEXT`, not `TIMESTAMPTZ` — formatRelativeTime.js
//    parses a SQLite-style "YYYY-MM-DD HH:MM:SS" UTC string directly
//    (`sqliteTimestamp.replace(' ', 'T')`) and would break on a raw JS
//    Date object. `to_char(now() AT TIME ZONE 'utc', 'YYYY-MM-DD HH24:MI:SS')`
//    reproduces SQLite's `datetime('now')` format exactly.
//  - `PRAGMA` statements (foreign_keys, journal_mode) are SQLite-only and
//    have no Postgres equivalent needed — FK enforcement is always on, and
//    Postgres has its own WAL.
//  - The interval-arithmetic syntax adjustment (`datetime('now', '+N
//    days')` -> `NOW() + make_interval(days => N)`) doesn't appear here —
//    it's used in repository query code (sessionsRepository.js,
//    emailVerificationRepository.js, passwordResetRepository.js), not in
//    any table default, so there was nothing to translate in the DDL
//    itself.
//  - The old SQLite file had retrofit/backfill functions
//    (ensureUsersPasswordColumn, ensureUsersEmailVerifiedColumn,
//    ensureUsersAvatarColumn, ensureDevUserPassword) that patched an
//    existing local database file predating certain columns. A fresh
//    schema applied to a new Supabase database never needed them, so
//    they were dropped rather than translated.
const UTC_TIMESTAMP_DEFAULT = `to_char(now() AT TIME ZONE 'utc', 'YYYY-MM-DD HH24:MI:SS')`

export const POSTGRES_SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS users (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  password_hash TEXT,
  email_verified_at TEXT,
  avatar_id TEXT,
  created_at TEXT NOT NULL DEFAULT (${UTC_TIMESTAMP_DEFAULT}),
  updated_at TEXT NOT NULL DEFAULT (${UTC_TIMESTAMP_DEFAULT})
);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (${UTC_TIMESTAMP_DEFAULT}),
  expires_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions (user_id);

CREATE TABLE IF NOT EXISTS email_verification_tokens (
  id TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (${UTC_TIMESTAMP_DEFAULT}),
  expires_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_user_id ON email_verification_tokens (user_id);

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (${UTC_TIMESTAMP_DEFAULT}),
  expires_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_id ON password_reset_tokens (user_id);

-- Local development only: a stand-in "inbox" so verification/reset emails
-- can be inspected without a real mail provider. Never written to in
-- production (see services/mail).
CREATE TABLE IF NOT EXISTS dev_outbox_emails (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  to_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (${UTC_TIMESTAMP_DEFAULT})
);
CREATE INDEX IF NOT EXISTS idx_dev_outbox_emails_to_email ON dev_outbox_emails (to_email);

CREATE TABLE IF NOT EXISTS projects (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'planning' CHECK (status IN ('active', 'planning', 'completed', 'archived')),
  created_at TEXT NOT NULL DEFAULT (${UTC_TIMESTAMP_DEFAULT}),
  updated_at TEXT NOT NULL DEFAULT (${UTC_TIMESTAMP_DEFAULT}),
  FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects (user_id);

CREATE TABLE IF NOT EXISTS agents (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id INTEGER NOT NULL,
  project_id INTEGER,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('active', 'paused', 'draft')),
  created_at TEXT NOT NULL DEFAULT (${UTC_TIMESTAMP_DEFAULT}),
  updated_at TEXT NOT NULL DEFAULT (${UTC_TIMESTAMP_DEFAULT}),
  FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_agents_user_id ON agents (user_id);
CREATE INDEX IF NOT EXISTS idx_agents_project_id ON agents (project_id);

CREATE TABLE IF NOT EXISTS conversations (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id INTEGER NOT NULL,
  agent_id INTEGER,
  title TEXT NOT NULL DEFAULT 'New conversation',
  created_at TEXT NOT NULL DEFAULT (${UTC_TIMESTAMP_DEFAULT}),
  updated_at TEXT NOT NULL DEFAULT (${UTC_TIMESTAMP_DEFAULT}),
  FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  FOREIGN KEY (agent_id) REFERENCES agents (id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON conversations (user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_agent_id ON conversations (agent_id);

CREATE TABLE IF NOT EXISTS messages (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  conversation_id INTEGER NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (${UTC_TIMESTAMP_DEFAULT}),
  FOREIGN KEY (conversation_id) REFERENCES conversations (id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages (conversation_id);

-- Real, granular activity log (distinct from the derived timestamp-based
-- feed dashboardRepository used before) — this is the only way to show
-- deletions, since a deleted project/agent row no longer exists to derive
-- an entry from. entity_name is a snapshot at event time so entries stay
-- readable after the entity itself is gone.
CREATE TABLE IF NOT EXISTS activity_events (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id INTEGER NOT NULL,
  type TEXT NOT NULL CHECK (type IN (
    'project_created', 'project_updated', 'project_deleted',
    'agent_created', 'agent_updated', 'agent_deleted',
    'profile_updated', 'preferences_updated'
  )),
  entity_type TEXT,
  entity_id INTEGER,
  entity_name TEXT,
  created_at TEXT NOT NULL DEFAULT (${UTC_TIMESTAMP_DEFAULT}),
  FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_activity_events_user_id ON activity_events (user_id);

-- Items requiring the user's attention (distinct from activity_events, which
-- is a full history log). read_at is NULL until the user opens/dismisses it;
-- entity_name is a snapshot at event time so entries stay readable after the
-- entity itself is deleted.
CREATE TABLE IF NOT EXISTS notifications (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id INTEGER NOT NULL,
  type TEXT NOT NULL CHECK (type IN (
    'project_created', 'project_updated', 'project_deleted',
    'agent_created', 'agent_updated', 'agent_deleted'
  )),
  entity_type TEXT,
  entity_id INTEGER,
  entity_name TEXT,
  read_at TEXT,
  created_at TEXT NOT NULL DEFAULT (${UTC_TIMESTAMP_DEFAULT}),
  FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications (user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications (user_id, read_at);

-- One row per user (created lazily on first write); absence of a row just
-- means "still on defaults", so reads always fall back to DEFAULT_PREFERENCES
-- rather than requiring a row to exist upfront.
CREATE TABLE IF NOT EXISTS user_preferences (
  user_id INTEGER PRIMARY KEY,
  theme TEXT NOT NULL DEFAULT 'system' CHECK (theme IN ('dark', 'light', 'system')),
  accent TEXT NOT NULL DEFAULT 'blue' CHECK (accent IN ('blue', 'purple', 'cyan')),
  density TEXT NOT NULL DEFAULT 'comfortable' CHECK (density IN ('comfortable', 'compact')),
  sidebar_collapsed BOOLEAN NOT NULL DEFAULT false,
  default_landing_page TEXT NOT NULL DEFAULT '/dashboard',
  reduced_motion BOOLEAN NOT NULL DEFAULT false,
  updated_at TEXT NOT NULL DEFAULT (${UTC_TIMESTAMP_DEFAULT}),
  FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);
`
