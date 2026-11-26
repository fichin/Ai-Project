-- Emergency only, run by hand (see docs/runbook.md). Recreates the empty table
-- exactly as 0001 had it. Afterwards:
-- DELETE FROM schema_migrations WHERE name = '0003_drop_dev_outbox_emails.sql';

CREATE TABLE IF NOT EXISTS dev_outbox_emails (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  to_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (to_char(now() AT TIME ZONE 'utc', 'YYYY-MM-DD HH24:MI:SS'))
);
CREATE INDEX IF NOT EXISTS idx_dev_outbox_emails_to_email ON dev_outbox_emails (to_email);
