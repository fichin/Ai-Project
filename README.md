# AI Project

[![CI](https://github.com/fichin/Ai-Project/actions/workflows/ci.yml/badge.svg)](https://github.com/fichin/Ai-Project/actions/workflows/ci.yml)

A full-stack React + Express + Postgres workspace for managing AI projects
and agents, with an AI assistant chat backed by Anthropic Claude.

**Live demo:** [ai-project-phi-sand.vercel.app](https://ai-project-phi-sand.vercel.app)
Demo login: `demo@example.com` / `Demo1234!` (pre-verified, no signup needed)

![The AI assistant chat rendering a Markdown reply with a heading, bold text, a list, a link and a code block](docs/chat-desktop.png)

> Both the frontend and backend are on free-tier hosting, so the first
> load after a period of inactivity can take 30-50 seconds while the
> backend spins back up — subsequent requests are fast.
>
> The live demo has usage limits (conversations, AI messages, and a
> shared daily cap) to keep it running sustainably on a free-tier AI
> provider key; a message appears in the chat once the demo account hits
> its daily limit.

## Features

- **AI assistant chat** — Anthropic Claude, with Groq as a free-tier
  fallback and a mock provider when neither API key is set; per-agent
  conversations with an optional per-agent persona
- **Safe Markdown rendering** — assistant replies render headings, lists,
  code blocks and links via `react-markdown`; raw HTML is never parsed and
  output is sanitized with `rehype-sanitize`
- **Rate limiting and usage caps** — IP- and email-keyed limiters on
  login, signup and password reset, a per-user limiter on chat, plus
  per-user and global AI usage caps (see [Security](#security))
- **Tests + CI** — 198 frontend tests (Vitest + React Testing Library) and
  backend tests on Node's test runner, run with lint and a production build
  on every push and PR via GitHub Actions
- Also: email/password auth with verification and password reset, a
  dashboard with an activity chart, project/agent CRUD with debounced
  search, notifications, an activity feed, user preferences (theme, accent,
  density, landing page), a Ctrl/Cmd+K command palette, and an
  accessibility pass (semantic HTML, keyboard navigation, ARIA labels,
  WCAG AA contrast in both themes)

## Tech stack

- **Frontend:** React 19, Vite, React Router, TanStack Query
- **Backend:** Node.js, Express
- **Database:** PostgreSQL (Supabase)
- **Email:** Resend (verification/reset links), with a console-log +
  local-outbox fallback for development
- **AI:** Anthropic Claude, with Groq as a free-tier fallback provider and a
  mock provider when neither API key is set — each agent can optionally
  have its own persona, folded into the chat system prompt
- **Testing/CI:** Vitest, React Testing Library, `node:test`, GitHub Actions
- **Design:** UI built with the help of an MCP integration with
  [pen.dev](https://www.pen.dev/), wiring a design tool directly into the
  agentic coding workflow

## Run locally

Requires Node.js 22.12+ and a Postgres database (a free Supabase project
works). No AI key is needed — without one, the chat uses the mock provider.

**1. Backend** — copy `server/.env.example` to `server/.env`, set at least
`DATABASE_URL`, then:
```bash
cd server
npm install
npm run dev           # http://localhost:4000
```

**2. Frontend** (in a second terminal, from the repo root):
```bash
npm install
npm run dev          # http://localhost:5173
```

**Environment variables** — `server/.env.example` documents every variable
inline; the essentials:

| Variable | Notes |
|---|---|
| `DATABASE_URL` | Postgres/Supabase connection string |
| `CORS_ORIGIN` | Origin allowed to call this API |
| `FRONTEND_URL` | Where the frontend is deployed — used to build links in verification/reset emails |
| `ANTHROPIC_API_KEY` / `GROQ_API_KEY` | AI provider key(s); falls back to a mock provider when both are unset |
| `RESEND_API_KEY` | Sends real verification/reset emails in production |
| `TRUST_PROXY_HOPS` | Reverse-proxy hop count used to resolve the real client IP for rate limiting — see Security below |
| `DEMO_EMAIL` | The public demo account's email, exempted from the per-email login rate limit |

## Testing

```bash
npm test
```

198 tests (Vitest + React Testing Library) covering hooks, contexts, pages,
and components.

Backend tests use Node's built-in test runner:

```bash
cd server && npm test
```

Covering the rate limiters (login/email throttling, IP-spoofing
resistance, the demo-account exemption) and the `/health/db` route.

## Continuous integration

Every push and pull request to `main` runs through GitHub Actions
(`.github/workflows/ci.yml`): install, lint, the full test suite, and a
production build for the frontend, plus install, the test suite, and a
syntax check of every source file for the backend. A red ✗ means something
is actually broken — lint errors, failing tests, or a build that doesn't
compile — before it ever reaches `main`, let alone the deployed app. See
the **Actions** tab on GitHub for run history.

A separate scheduled workflow (`.github/workflows/keepalive.yml`) pings the
live deployment's `GET /api/health/db` every 3 days so the free Supabase
project backing it doesn't auto-pause itself from inactivity.

## Security

**Rate limiting behind the Vercel → Render proxy chain.** The live deployment's
request path is browser → Vercel (rewrites `/api/*` to Render) → Cloudflare (in
front of Render) → Render's own internal proxy → the app. `TRUST_PROXY_HOPS`
(see `server/.env.example`) tells Express how many of those hops to trust when
resolving the real client IP from `X-Forwarded-For`, and production is
configured with `TRUST_PROXY_HOPS=4` on Render to account for that full chain.
This was confirmed directly from Render's own logs via temporary debug
logging: `X-Forwarded-For` consistently carried exactly 4 entries per request
(the real client, Vercel's egress IP on AWS, a Cloudflare IP in front of
Render, and a Render-internal `10.x` address), and the process id stayed
constant across requests, confirming a single backend instance rather than
several independently-counting ones.

Even so, **the IP-based rate limit is treated as best-effort, not as the
primary defense** — Vercel's rewrite can let a spoofed `X-Forwarded-For` pass
through as the first entry of the header on its way to Render, so `req.ip`
isn't fully trustworthy by construction, hop count aside. `loginLimiter`,
`forgotPasswordLimiter`, and `resendVerificationLimiter` (all keyed by
`req.ip`) sit alongside — not instead of — limiters keyed by the normalized
account email (`loginPerEmailLimiter`, `forgotPasswordPerEmailLimiter`,
`resendVerificationPerEmailLimiter`, see `server/src/middleware/rateLimiters.js`).
No amount of IP or `X-Forwarded-For` manipulation can move a request into a
different email's bucket, so these hold regardless. The AI usage caps
(`MAX_CONVERSATIONS_PER_USER`, `MAX_AI_MESSAGES_PER_USER_PER_DAY`,
`MAX_AI_CALLS_PER_DAY` — see `server/src/config/env.js`) are the real
backstop against cost abuse specifically: they bound total spend regardless of
how fast or from how many apparent IPs a user or script hits the API.

**AI output is treated as untrusted.** Assistant replies are rendered as
Markdown without parsing raw HTML, then sanitized with `rehype-sanitize`
(GitHub's allowlist schema), so a reply containing `<script>`, event-handler
attributes or `javascript:` links can't execute — covered by a component
test. Links open in a new tab with `rel="noopener noreferrer"`.

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

## License: MIT
