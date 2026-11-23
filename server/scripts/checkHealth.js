import { appendFile } from 'node:fs/promises'
import { pathToFileURL } from 'node:url'

// Render's free tier can take ~50s to wake up, so a single failed request
// doesn't mean the app is down.
const DEFAULTS = {
  attempts: 4,
  delayMs: 15_000,
  timeoutMs: 90_000,
}

function defaultSleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function describeError(error, timeoutMs) {
  if (error.name === 'TimeoutError') {
    return `timed out after ${timeoutMs}ms`
  }
  // fetch() wraps DNS/connection failures; the useful code is on `cause`.
  return `network error (${error.cause?.code ?? error.name})`
}

export async function checkEndpoint(url, options = {}) {
  const { fetchFn = fetch, sleep = defaultSleep, attempts, delayMs, timeoutMs } = { ...DEFAULTS, ...options }
  let problem = 'no attempts made'

  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      const response = await fetchFn(url, { signal: AbortSignal.timeout(timeoutMs) })
      if (response.ok) {
        return { ok: true, attempts: attempt }
      }
      problem = `HTTP ${response.status}`
    } catch (error) {
      problem = describeError(error, timeoutMs)
    }

    if (attempt < attempts) {
      await sleep(delayMs)
    }
  }

  return { ok: false, attempts, problem }
}

// /api/health proves the backend is up; /api/health/db proves it can reach
// Postgres. Checking them in order tells us which layer is broken.
export async function checkHealth(baseUrl, options = {}) {
  const root = baseUrl.replace(/\/+$/, '')

  const backend = await checkEndpoint(`${root}/api/health`, options)
  if (!backend.ok) {
    return { status: 'backend_down', problem: backend.problem }
  }

  const database = await checkEndpoint(`${root}/api/health/db`, options)
  if (!database.ok) {
    return { status: 'db_down', problem: database.problem }
  }

  return { status: 'ok' }
}

const MESSAGES = {
  ok: 'Live demo is healthy.',
  backend_down: 'Backend is not responding (Render). See docs/runbook.md#backend_down',
  db_down: 'Backend is up but cannot reach the database (Supabase). See docs/runbook.md#db_down',
}

export function formatResult(result) {
  const message = MESSAGES[result.status]
  return result.problem ? `${message} Last problem: ${result.problem}.` : message
}

// Kept separate from the top-level script so tests can call it with fakes
// instead of touching process.argv, process.exit or real files.
export async function runCli({ argv, env, log, appendFile, check = checkHealth }) {
  const baseUrl = argv[2]
  if (!baseUrl) {
    log('Usage: node scripts/checkHealth.js <base-url>')
    return 2
  }

  const result = await check(baseUrl)
  log(formatResult(result))

  // GitHub Actions reads step outputs from this file; the next step uses
  // `status` to title or close the outage issue.
  if (env.GITHUB_OUTPUT) {
    await appendFile(env.GITHUB_OUTPUT, `status=${result.status}\n`)
  }

  return result.status === 'ok' ? 0 : 1
}

const isRunDirectly = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href
if (isRunDirectly) {
  process.exitCode = await runCli({ argv: process.argv, env: process.env, log: console.log, appendFile })
}
