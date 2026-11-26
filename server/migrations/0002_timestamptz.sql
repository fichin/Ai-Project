-- Timestamps were TEXT in "YYYY-MM-DD HH:MM:SS" UTC (a SQLite leftover).
-- Each value is read explicitly as UTC: a bare ::timestamptz cast would use the
-- session's time zone and could shift every row by hours.
-- A TEXT default can't be cast to timestamptz, so it is dropped, then replaced.
-- dev_outbox_emails is skipped: 0003 drops it.

ALTER TABLE users
  ALTER COLUMN email_verified_at TYPE timestamptz USING (email_verified_at::timestamp AT TIME ZONE 'UTC'),
  ALTER COLUMN created_at DROP DEFAULT,
  ALTER COLUMN created_at TYPE timestamptz USING (created_at::timestamp AT TIME ZONE 'UTC'),
  ALTER COLUMN created_at SET DEFAULT now(),
  ALTER COLUMN updated_at DROP DEFAULT,
  ALTER COLUMN updated_at TYPE timestamptz USING (updated_at::timestamp AT TIME ZONE 'UTC'),
  ALTER COLUMN updated_at SET DEFAULT now();

ALTER TABLE sessions
  ALTER COLUMN created_at DROP DEFAULT,
  ALTER COLUMN created_at TYPE timestamptz USING (created_at::timestamp AT TIME ZONE 'UTC'),
  ALTER COLUMN created_at SET DEFAULT now(),
  ALTER COLUMN expires_at TYPE timestamptz USING (expires_at::timestamp AT TIME ZONE 'UTC');

ALTER TABLE email_verification_tokens
  ALTER COLUMN created_at DROP DEFAULT,
  ALTER COLUMN created_at TYPE timestamptz USING (created_at::timestamp AT TIME ZONE 'UTC'),
  ALTER COLUMN created_at SET DEFAULT now(),
  ALTER COLUMN expires_at TYPE timestamptz USING (expires_at::timestamp AT TIME ZONE 'UTC');

ALTER TABLE password_reset_tokens
  ALTER COLUMN created_at DROP DEFAULT,
  ALTER COLUMN created_at TYPE timestamptz USING (created_at::timestamp AT TIME ZONE 'UTC'),
  ALTER COLUMN created_at SET DEFAULT now(),
  ALTER COLUMN expires_at TYPE timestamptz USING (expires_at::timestamp AT TIME ZONE 'UTC');

ALTER TABLE projects
  ALTER COLUMN created_at DROP DEFAULT,
  ALTER COLUMN created_at TYPE timestamptz USING (created_at::timestamp AT TIME ZONE 'UTC'),
  ALTER COLUMN created_at SET DEFAULT now(),
  ALTER COLUMN updated_at DROP DEFAULT,
  ALTER COLUMN updated_at TYPE timestamptz USING (updated_at::timestamp AT TIME ZONE 'UTC'),
  ALTER COLUMN updated_at SET DEFAULT now();

ALTER TABLE agents
  ALTER COLUMN created_at DROP DEFAULT,
  ALTER COLUMN created_at TYPE timestamptz USING (created_at::timestamp AT TIME ZONE 'UTC'),
  ALTER COLUMN created_at SET DEFAULT now(),
  ALTER COLUMN updated_at DROP DEFAULT,
  ALTER COLUMN updated_at TYPE timestamptz USING (updated_at::timestamp AT TIME ZONE 'UTC'),
  ALTER COLUMN updated_at SET DEFAULT now();

ALTER TABLE conversations
  ALTER COLUMN created_at DROP DEFAULT,
  ALTER COLUMN created_at TYPE timestamptz USING (created_at::timestamp AT TIME ZONE 'UTC'),
  ALTER COLUMN created_at SET DEFAULT now(),
  ALTER COLUMN updated_at DROP DEFAULT,
  ALTER COLUMN updated_at TYPE timestamptz USING (updated_at::timestamp AT TIME ZONE 'UTC'),
  ALTER COLUMN updated_at SET DEFAULT now();

ALTER TABLE messages
  ALTER COLUMN created_at DROP DEFAULT,
  ALTER COLUMN created_at TYPE timestamptz USING (created_at::timestamp AT TIME ZONE 'UTC'),
  ALTER COLUMN created_at SET DEFAULT now();

ALTER TABLE activity_events
  ALTER COLUMN created_at DROP DEFAULT,
  ALTER COLUMN created_at TYPE timestamptz USING (created_at::timestamp AT TIME ZONE 'UTC'),
  ALTER COLUMN created_at SET DEFAULT now();

ALTER TABLE notifications
  ALTER COLUMN read_at TYPE timestamptz USING (read_at::timestamp AT TIME ZONE 'UTC'),
  ALTER COLUMN created_at DROP DEFAULT,
  ALTER COLUMN created_at TYPE timestamptz USING (created_at::timestamp AT TIME ZONE 'UTC'),
  ALTER COLUMN created_at SET DEFAULT now();

ALTER TABLE user_preferences
  ALTER COLUMN updated_at DROP DEFAULT,
  ALTER COLUMN updated_at TYPE timestamptz USING (updated_at::timestamp AT TIME ZONE 'UTC'),
  ALTER COLUMN updated_at SET DEFAULT now();
