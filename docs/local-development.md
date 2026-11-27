# Local development and tests

Local development never uses the production database. In November 2026
unmerged local code ran against production and added a column by hand
(`agents.persona`, see [database-migrations.md](database-migrations.md)).
This setup makes that hard to repeat.

## The development database

```bash
cd server
npm run db:dev
```

This starts a real Postgres on your machine with no Docker or install:
[PGlite](https://pglite.dev/) saved in `server/data/dev-db/` (git-ignored) and
served on `127.0.0.1:5433`. It applies any new migrations on every start, so
after a pull a restart is enough. It prints the two lines for `server/.env`:

```
DATABASE_URL=postgres://postgres@127.0.0.1:5433/postgres
DATABASE_POOL_MAX=1
```

Then run `npm run dev` in a second terminal. Stop the database with Ctrl+C,
which saves it to disk cleanly.

- `DATABASE_POOL_MAX=1` is required: the PGlite server shares one Postgres
  session between all connections, so two connections at once would mix
  their transactions.
- It listens on `127.0.0.1` only and has no password, so nothing else on the
  network can reach it.
- `DEV_DB_PORT` and `DEV_DB_DIR` change the port and folder.
- To start from empty, stop it and delete `server/data/dev-db/`.
- PGlite is Postgres 19; Supabase runs 17. CI tests on 17 (see below).

## The guard

Outside production, `npm run dev` and `npm start` refuse to start unless
`DATABASE_URL` points at:

- a local host (`localhost`, `127.0.0.1`, `[::1]`), or
- the Supabase project whose ref is in `DEV_DATABASE_SUPABASE_REF`, for a
  second, development-only Supabase project.

Anything else, including a remote host that isn't Supabase, is refused with a
message that names the host (never the password). The guard is skipped when
`NODE_ENV=production` or Render's `RENDER` variable is set, so it can never
stop the live site. Code: `server/src/config/databaseGuard.js`.

`npm run migrate` is not guarded: it is how production is migrated (see
[database-migrations.md](database-migrations.md)), and it protects itself by
printing the target and requiring `--yes`.

## Tests

```bash
cd server && npm test
```

- `src/` and `scripts/`: unit tests, plus database tests on in-memory PGlite.
- `test/`: integration tests. The real Express app on a fresh, migrated
  database per test file, driven over HTTP by signed-in test users. Only the
  AI (mock provider) and the email sender (dev outbox) are not real.

Where the integration tests get their database:

- **Your laptop:** in-memory PGlite over TCP. Nothing to set up.
- **CI:** a `postgres:17` service container. `TEST_DATABASE_URL` points at it,
  and each test file creates and drops its own `test_<random>` database.

`TEST_DATABASE_URL` must be a local host; the helpers refuse anything else,
because the tests truncate and drop data. To run against a local Postgres:

```bash
TEST_DATABASE_URL=postgres://postgres:postgres@localhost:5432/postgres npm test
```

`test/helpers/env.js` sets the environment before the app loads: no AI keys,
no `DATABASE_URL`, high rate limits, small pinned quotas. Values in
`server/.env` can't leak into tests, because dotenv never overrides a
variable that is already set.

## CI

The backend job in `.github/workflows/ci.yml`, on Postgres 17:

1. `npm run migrate -- --yes`, then `--check`. The production runbook's own
   commands on an empty database; `--check` exits non-zero on drift.
2. `npm test`: unit and integration tests.
3. A syntax check of every file in `src/`, `scripts/` and `test/`.
