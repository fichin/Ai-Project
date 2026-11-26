# Database migrations

The schema lives in numbered SQL files in `server/migrations/`. The database
records each file it has run in `schema_migrations` (name, checksum, time), so
`npm run migrate` only runs the new ones, in order, in one transaction.

Rules:

- Never edit a migration that has been applied anywhere. Add a new file instead.
  The runner refuses to continue if an applied file's checksum changed.
- Files in `server/migrations/down/` are hand-run emergency reverses. The runner
  never runs them.

## Commands

Run from `server/`. Every command first prints the target database.

| Command | What it does | Writes? |
|---|---|---|
| `npm run migrate` | Prints the target, then stops | No, doesn't connect |
| `npm run migrate -- --check` | Applied, pending, and schema drift | No (read-only transaction) |
| `npm run migrate -- --dry-run` | Runs pending migrations, prints row counts, rolls back | No (rolled back) |
| `npm run migrate -- --baseline --yes` | Records 0001 as applied on a database built by hand | One row in `schema_migrations` |
| `npm run migrate -- --yes` | Applies pending migrations | Yes |

A new local database only needs `npm run migrate -- --yes`.

## One-time: move production onto migrations (PR 5)

Production was built by hand from `0001_baseline.sql` and stores timestamps as
TEXT. These steps baseline it, then run `0002` (TEXT to timestamptz) and `0003`
(drop the unused `dev_outbox_emails` table). Do them in one sitting, when nobody
is using the demo.

### 0. Prepare (no changes)

1. Supabase dashboard → **Connect** → copy the **Session pooler** connection
   string (port 5432) and fill in the database password. If the password has
   characters like `@`, `#` or `/`, URL-encode them.
2. Supabase **SQL editor**: run `SELECT version();` and note the major version
   (for example 15 or 17).
3. Install the PostgreSQL command-line tools with **the same or a newer major
   version**, for example from <https://www.postgresql.org/download/windows/>
   (in the installer, "Command Line Tools" is enough). Check with
   `pg_dump --version`.
4. In a PowerShell window, set the URL **for this window only**, so
   `server/.env` stays as it is:

   ```powershell
   $env:DATABASE_URL = "postgresql://postgres.<ref>:<password>@<host>:5432/postgres"
   ```

### 1. Back up

```powershell
pg_dump $env:DATABASE_URL --schema=public --format=custom --file=backup-before-pr5.dump
pg_restore --list backup-before-pr5.dump | Select-Object -First 20
```

The list should show the tables (`users`, `messages`, ...). The file holds real
user data (emails, password hashes): keep it private, never commit it, and
delete it once production has run fine for a week.

### 2. Check (read-only)

```powershell
cd server
npm run migrate -- --check
```

Expected:

```
Applied: none (not tracked yet)
Pending: 0001_baseline.sql, 0002_timestamptz.sql, 0003_drop_dev_outbox_emails.sql
Schema matches 0001_baseline.sql.
```

If it says the schema differs, **stop**. Production doesn't match the repo, and
the differences it lists need their own fix first.

### 3. Baseline

```powershell
npm run migrate -- --baseline --yes
```

Expected: `Recorded 0001_baseline.sql as applied (nothing else changed).`

### 4. Dry run

```powershell
npm run migrate -- --dry-run
```

Expected: `Dry run, rolled back. Would apply: 0002_timestamptz.sql, 0003_drop_dev_outbox_emails.sql`,
then one line per table with the same count before and after, and
`dev_outbox_emails: 0 -> dropped`. Nothing should say `CHANGED`.

If it fails (for example a timestamp value that can't be read), nothing was
changed. Copy the error and fix the data before going on.

The dry run locks the tables for its duration (a second or two with the demo's
data), so the app waits briefly while it runs.

### 5. Deploy, then migrate right away

Old code writes TEXT and new code expects timestamptz, so the two must switch
close together. Logins and the chat may fail for the minute in between.

1. Merge the PR. Vercel deploys the frontend; it reads both timestamp formats.
2. Render dashboard → the API service: wait until the new deploy is **Live**
   (trigger a manual deploy if auto-deploy is off).
3. Immediately run:

   ```powershell
   npm run migrate -- --yes
   ```

   Expected: `Applied: 0002_timestamptz.sql, 0003_drop_dev_outbox_emails.sql`
   and unchanged row counts.

### 6. Verify

1. `npm run migrate -- --check`: `Pending: none` and
   `Schema matches 0003_drop_dev_outbox_emails.sql.`
2. `https://ai-project-phi-sand.vercel.app/api/health/db` returns `{"status":"ok"}`.
3. Log in with the demo account. Open a project: the created and updated dates
   are real dates, not "Invalid Date". The dashboard chart has bars, and the
   chat answers.
4. Close the PowerShell window, or run `Remove-Item Env:DATABASE_URL`.

## Rolling back

**A migration failed while running:** nothing to do. It ran in one transaction,
so Postgres already undid all of it.

**It succeeded, but the app is broken:** schema and code must go back together.

1. Supabase SQL editor, in one transaction, in reverse order:

   ```sql
   BEGIN;
   -- paste server/migrations/down/0003_drop_dev_outbox_emails.down.sql
   -- paste server/migrations/down/0002_timestamptz.down.sql
   DELETE FROM schema_migrations
     WHERE name IN ('0002_timestamptz.sql', '0003_drop_dev_outbox_emails.sql');
   COMMIT;
   ```

2. Render → the API service → roll back to the deploy before the PR.

The down file turns timestamps back into the old TEXT format and loses
fractions of a second, which the old code never had anyway.

**Last resort, restore the backup.** This replaces the tables with the state
from step 1, so anything written since then is lost:

```powershell
pg_restore --clean --if-exists --no-owner --dbname=$env:DATABASE_URL backup-before-pr5.dump
```
