-- Emergency only, run by hand (see docs/runbook.md); the migrator never runs it.
-- Reverses 0002 back to TEXT in the old format. Sub-second precision is lost.
-- Afterwards: DELETE FROM schema_migrations WHERE name = '0002_timestamptz.sql';
-- and roll the backend back to the release before 0002.

ALTER TABLE users
  ALTER COLUMN email_verified_at TYPE text USING to_char(email_verified_at AT TIME ZONE 'UTC', 'YYYY-MM-DD HH24:MI:SS'),
  ALTER COLUMN created_at DROP DEFAULT,
  ALTER COLUMN created_at TYPE text USING to_char(created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD HH24:MI:SS'),
  ALTER COLUMN created_at SET DEFAULT (to_char(now() AT TIME ZONE 'utc', 'YYYY-MM-DD HH24:MI:SS')),
  ALTER COLUMN updated_at DROP DEFAULT,
  ALTER COLUMN updated_at TYPE text USING to_char(updated_at AT TIME ZONE 'UTC', 'YYYY-MM-DD HH24:MI:SS'),
  ALTER COLUMN updated_at SET DEFAULT (to_char(now() AT TIME ZONE 'utc', 'YYYY-MM-DD HH24:MI:SS'));

ALTER TABLE sessions
  ALTER COLUMN created_at DROP DEFAULT,
  ALTER COLUMN created_at TYPE text USING to_char(created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD HH24:MI:SS'),
  ALTER COLUMN created_at SET DEFAULT (to_char(now() AT TIME ZONE 'utc', 'YYYY-MM-DD HH24:MI:SS')),
  ALTER COLUMN expires_at TYPE text USING to_char(expires_at AT TIME ZONE 'UTC', 'YYYY-MM-DD HH24:MI:SS');

ALTER TABLE email_verification_tokens
  ALTER COLUMN created_at DROP DEFAULT,
  ALTER COLUMN created_at TYPE text USING to_char(created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD HH24:MI:SS'),
  ALTER COLUMN created_at SET DEFAULT (to_char(now() AT TIME ZONE 'utc', 'YYYY-MM-DD HH24:MI:SS')),
  ALTER COLUMN expires_at TYPE text USING to_char(expires_at AT TIME ZONE 'UTC', 'YYYY-MM-DD HH24:MI:SS');

ALTER TABLE password_reset_tokens
  ALTER COLUMN created_at DROP DEFAULT,
  ALTER COLUMN created_at TYPE text USING to_char(created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD HH24:MI:SS'),
  ALTER COLUMN created_at SET DEFAULT (to_char(now() AT TIME ZONE 'utc', 'YYYY-MM-DD HH24:MI:SS')),
  ALTER COLUMN expires_at TYPE text USING to_char(expires_at AT TIME ZONE 'UTC', 'YYYY-MM-DD HH24:MI:SS');

ALTER TABLE projects
  ALTER COLUMN created_at DROP DEFAULT,
  ALTER COLUMN created_at TYPE text USING to_char(created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD HH24:MI:SS'),
  ALTER COLUMN created_at SET DEFAULT (to_char(now() AT TIME ZONE 'utc', 'YYYY-MM-DD HH24:MI:SS')),
  ALTER COLUMN updated_at DROP DEFAULT,
  ALTER COLUMN updated_at TYPE text USING to_char(updated_at AT TIME ZONE 'UTC', 'YYYY-MM-DD HH24:MI:SS'),
  ALTER COLUMN updated_at SET DEFAULT (to_char(now() AT TIME ZONE 'utc', 'YYYY-MM-DD HH24:MI:SS'));

ALTER TABLE agents
  ALTER COLUMN created_at DROP DEFAULT,
  ALTER COLUMN created_at TYPE text USING to_char(created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD HH24:MI:SS'),
  ALTER COLUMN created_at SET DEFAULT (to_char(now() AT TIME ZONE 'utc', 'YYYY-MM-DD HH24:MI:SS')),
  ALTER COLUMN updated_at DROP DEFAULT,
  ALTER COLUMN updated_at TYPE text USING to_char(updated_at AT TIME ZONE 'UTC', 'YYYY-MM-DD HH24:MI:SS'),
  ALTER COLUMN updated_at SET DEFAULT (to_char(now() AT TIME ZONE 'utc', 'YYYY-MM-DD HH24:MI:SS'));

ALTER TABLE conversations
  ALTER COLUMN created_at DROP DEFAULT,
  ALTER COLUMN created_at TYPE text USING to_char(created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD HH24:MI:SS'),
  ALTER COLUMN created_at SET DEFAULT (to_char(now() AT TIME ZONE 'utc', 'YYYY-MM-DD HH24:MI:SS')),
  ALTER COLUMN updated_at DROP DEFAULT,
  ALTER COLUMN updated_at TYPE text USING to_char(updated_at AT TIME ZONE 'UTC', 'YYYY-MM-DD HH24:MI:SS'),
  ALTER COLUMN updated_at SET DEFAULT (to_char(now() AT TIME ZONE 'utc', 'YYYY-MM-DD HH24:MI:SS'));

ALTER TABLE messages
  ALTER COLUMN created_at DROP DEFAULT,
  ALTER COLUMN created_at TYPE text USING to_char(created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD HH24:MI:SS'),
  ALTER COLUMN created_at SET DEFAULT (to_char(now() AT TIME ZONE 'utc', 'YYYY-MM-DD HH24:MI:SS'));

ALTER TABLE activity_events
  ALTER COLUMN created_at DROP DEFAULT,
  ALTER COLUMN created_at TYPE text USING to_char(created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD HH24:MI:SS'),
  ALTER COLUMN created_at SET DEFAULT (to_char(now() AT TIME ZONE 'utc', 'YYYY-MM-DD HH24:MI:SS'));

ALTER TABLE notifications
  ALTER COLUMN read_at TYPE text USING to_char(read_at AT TIME ZONE 'UTC', 'YYYY-MM-DD HH24:MI:SS'),
  ALTER COLUMN created_at DROP DEFAULT,
  ALTER COLUMN created_at TYPE text USING to_char(created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD HH24:MI:SS'),
  ALTER COLUMN created_at SET DEFAULT (to_char(now() AT TIME ZONE 'utc', 'YYYY-MM-DD HH24:MI:SS'));

ALTER TABLE user_preferences
  ALTER COLUMN updated_at DROP DEFAULT,
  ALTER COLUMN updated_at TYPE text USING to_char(updated_at AT TIME ZONE 'UTC', 'YYYY-MM-DD HH24:MI:SS'),
  ALTER COLUMN updated_at SET DEFAULT (to_char(now() AT TIME ZONE 'utc', 'YYYY-MM-DD HH24:MI:SS'));
