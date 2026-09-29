# AI Project

A full-stack workspace for managing AI-driven projects and agents — auth, a
dashboard, project/agent CRUD, an AI assistant chat, notifications, an
activity feed, and per-user preferences, built as a portfolio-grade
demonstration of a production-shaped React + Express + Postgres app.

**Live demo:** [ai-project-phi-sand.vercel.app](https://ai-project-phi-sand.vercel.app)
Demo login: `demo@example.com` / `Demo1234!` (pre-verified, no signup needed)

## Tech stack

- **Frontend:** React 19, Vite, React Router, TanStack Query
- **Backend:** Node.js, Express
- **Database:** PostgreSQL (Supabase)
- **Email:** Resend (verification/reset links), with a console-log +
  local-outbox fallback for development
- **AI:** Anthropic Claude (with a mock provider when no API key is set)
- **Design:** UI built with the help of an MCP integration with
  [pen.dev](https://www.pen.dev/), wiring a design tool directly into the
  agentic coding workflow

## Key features

- Email/password auth with email verification and password reset
- Dashboard with usage stats and an activity trend chart
- Full CRUD for projects and agents, with debounced (300ms) search/filtering
  so filtering doesn't run on every keystroke
- AI assistant chat (per-agent conversations)
- Notifications and a full activity feed
- User preferences (theme, accent color, density, default landing page)
- Command palette (Ctrl/Cmd+K) for quick navigation
- Accessibility-audited: semantic HTML, keyboard navigation, ARIA labeling,
  and WCAG AA color contrast across both themes

## Local setup

**Frontend:**
```bash
npm install
npm run dev          # http://localhost:5173
```

**Backend** (in a second terminal):
```bash
cd server
npm install
npm run dev           # http://localhost:4000
```

**Environment variables** — copy `server/.env.example` to `server/.env` and fill in:

| Variable | Required | Notes |
|---|---|---|
| `DATABASE_URL` | Yes | Postgres/Supabase connection string |
| `CORS_ORIGIN` | No | Defaults to `http://localhost:5173` |
| `FRONTEND_URL` | No | Defaults to `http://localhost:5173`; set to the deployed frontend URL in production so email links point to the right place |
| `ANTHROPIC_API_KEY` | No | Falls back to a mock AI provider when unset |
| `RESEND_API_KEY` | No | Only used when `NODE_ENV=production`; otherwise emails are logged to the console and a local dev outbox |
| `DATABASE_PATH` | No | Local SQLite file for the dev-only email outbox |

## Testing

```bash
npm test
```

178 tests (Vitest + React Testing Library) covering hooks, contexts, pages,
and components. There is no backend test framework — API changes are
verified manually.

## Architecture note: the Postgres migration

The app originally ran on a single local SQLite file. It was migrated to
Postgres/Supabase incrementally, one repository at a time, rather than as a
single rewrite: each `db/*Repository.js` module was converted from
synchronous `better-sqlite3` calls to async `pg` queries independently,
keeping the same function signatures so calling routes needed minimal
changes. Data-fetching on the frontend followed the same incremental
approach, moving page-by-page from hand-rolled `useEffect`/`useState`
fetching to TanStack Query, which also brought in cache invalidation,
optimistic updates, and request de-duplication without a big-bang
rewrite. The one piece intentionally left on SQLite is the local
development email outbox (`server/data/dev-outbox.db`) — a throwaway
convenience for reading back verification/reset links locally, not part
of the app's real data.
