// Timestamps are TEXT in "YYYY-MM-DD HH:MM:SS" UTC, not TIMESTAMPTZ, because
// formatRelativeTime.js parses that exact format on the frontend.
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

-- Unused: the dev email outbox lives in SQLite (db/devOutboxDb.js).
-- Left in place until migrations (PR 5) can drop it safely.
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

-- An event log, because a deleted row can't be shown in a feed derived from
-- the rows themselves. entity_name is a snapshot so entries outlive the entity.
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

-- Unlike activity_events (full history), these need attention; read_at stays
-- NULL until dismissed.
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

-- Created lazily on first write; no row means "still on defaults".
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
