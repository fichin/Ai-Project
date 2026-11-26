# Runbook: live demo is down

The daily [Keepalive workflow](../.github/workflows/keepalive.yml) runs
`server/scripts/checkHealth.js` against the live demo. When the check fails, it
opens a GitHub issue labelled `outage`, or comments on the one already open.
The first green run after that closes the issue.

Changing the database schema has its own guide: [database-migrations.md](database-migrations.md).

## First check (1 minute)

Open these two URLs in a browser. The first request after idle can take
about 50 seconds while Render wakes up.

| URL | Healthy response |
|---|---|
| `https://ai-project-phi-sand.vercel.app/api/health` | `{"status":"ok", ...}` |
| `https://ai-project-phi-sand.vercel.app/api/health/db` | `{"status":"ok"}` |

- `/api/health` fails: see [backend_down](#backend_down).
- `/api/health` is ok but `/api/health/db` returns 503: see [db_down](#db_down).

## backend_down

The Express API on Render is not answering.

1. **Render dashboard → the API service → Events and Logs.** Look for a failed
   deploy, a crash on start (often a missing environment variable) or a
   suspended free-tier service.
2. If the latest deploy failed, fix the cause and redeploy. If it crashed after
   a good deploy, restart it and read the first error in the logs.
3. If Render looks healthy, check that the `/api/*` rewrite in `vercel.json`
   still points to the right Render URL.

## db_down

The API is up but `SELECT 1` against Postgres fails.

1. **Supabase dashboard → the project.** If it shows **Paused**, click
   **Restore project** and wait a few minutes. Free projects pause after a
   period of inactivity. Pinging did not prevent this in November 2026.
2. Render logs show `[health/db] database check failed:` followed by the real
   error. Typical errors:
   - `tenant/user postgres.<ref> not found`: the pooler no longer knows the
     project. It is paused or deleted, so see step 1.
   - `password authentication failed`: the database password changed. Update
     `DATABASE_URL` on Render.
   - `ENOTFOUND <ref>.supabase.co`: the project's hostname is gone, which
     also means paused or deleted.
3. If the project is not paused, check the [Supabase status page](https://status.supabase.com).

Never paste connection strings or keys into issues, chats or commits.

## After the fix

1. Confirm that both URLs from the first check return ok.
2. Actions → Keepalive → **Run workflow**. The green run closes the outage issue.
3. Log in with the demo account to confirm the app works end to end.

## Incident log

| Date | Status | Cause | Fix | Time to detect |
|---|---|---|---|---|
| 2026-11-10 to 2026-11-23 | db_down | Supabase free project paused despite pings every 3 days | Restored in the Supabase dashboard | about 13 days (the failing keepalive alerted nobody) |
