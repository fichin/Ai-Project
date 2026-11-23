import { test } from 'node:test'
import assert from 'node:assert/strict'
import { checkEndpoint, checkHealth } from './checkHealth.js'

// Each call to the fake fetch takes the next scripted outcome: a number is an
// HTTP status, an Error is thrown like a real network failure.
function scriptedFetch(outcomes) {
  const calls = []
  const fetchFn = async (url) => {
    calls.push(url)
    const next = outcomes[calls.length - 1]
    if (next instanceof Error) throw next
    return { ok: next >= 200 && next < 300, status: next }
  }
  return { fetchFn, calls }
}

function recordingSleep() {
  const waits = []
  return { sleep: async (ms) => waits.push(ms), waits }
}

test('succeeds on the first attempt without waiting', async () => {
  const { fetchFn, calls } = scriptedFetch([200])
  const { sleep, waits } = recordingSleep()

  const result = await checkEndpoint('https://x/api/health', { fetchFn, sleep })

  assert.deepEqual(result, { ok: true, attempts: 1 })
  assert.equal(calls.length, 1)
  assert.deepEqual(waits, [])
})

test('survives a cold start: fails twice, then succeeds', async () => {
  const { fetchFn } = scriptedFetch([502, 502, 200])
  const { sleep, waits } = recordingSleep()

  const result = await checkEndpoint('https://x/api/health', { fetchFn, sleep, delayMs: 10 })

  assert.deepEqual(result, { ok: true, attempts: 3 })
  assert.deepEqual(waits, [10, 10])
})

test('gives up after the configured attempts and reports the last status', async () => {
  const { fetchFn, calls } = scriptedFetch([502, 503, 503])
  const { sleep, waits } = recordingSleep()

  const result = await checkEndpoint('https://x/api/health/db', { fetchFn, sleep, attempts: 3 })

  assert.deepEqual(result, { ok: false, attempts: 3, problem: 'HTTP 503' })
  assert.equal(calls.length, 3)
  assert.equal(waits.length, 2, 'no pointless wait after the final attempt')
})

test('reports a timeout in plain words', async () => {
  const timeout = new DOMException('The operation was aborted due to timeout', 'TimeoutError')
  const { fetchFn } = scriptedFetch([timeout])
  const { sleep } = recordingSleep()

  const result = await checkEndpoint('https://x/api/health', { fetchFn, sleep, attempts: 1, timeoutMs: 500 })

  assert.deepEqual(result, { ok: false, attempts: 1, problem: 'timed out after 500ms' })
})

test('reports the underlying network error code', async () => {
  const dnsFailure = new TypeError('fetch failed', { cause: { code: 'ENOTFOUND' } })
  const { fetchFn } = scriptedFetch([dnsFailure])
  const { sleep } = recordingSleep()

  const result = await checkEndpoint('https://x/api/health', { fetchFn, sleep, attempts: 1 })

  assert.deepEqual(result, { ok: false, attempts: 1, problem: 'network error (ENOTFOUND)' })
})

// Routes each URL to its own scripted outcomes, so the backend and database
// checks can fail independently.
function routedFetch(routes) {
  const calls = []
  const counters = {}
  const fetchFn = async (url) => {
    calls.push(url)
    const path = new URL(url).pathname
    counters[path] = (counters[path] ?? 0) + 1
    const next = routes[path][counters[path] - 1]
    if (next instanceof Error) throw next
    return { ok: next >= 200 && next < 300, status: next }
  }
  return { fetchFn, calls }
}

const fast = { sleep: async () => {}, attempts: 2 }

test('checkHealth: ok when both endpoints answer, checked backend first', async () => {
  const { fetchFn, calls } = routedFetch({ '/api/health': [200], '/api/health/db': [200] })

  const result = await checkHealth('https://demo.example', { ...fast, fetchFn })

  assert.deepEqual(result, { status: 'ok' })
  assert.deepEqual(calls, ['https://demo.example/api/health', 'https://demo.example/api/health/db'])
})

test('checkHealth: backend_down skips the database check', async () => {
  const { fetchFn, calls } = routedFetch({ '/api/health': [502, 502], '/api/health/db': [200] })

  const result = await checkHealth('https://demo.example', { ...fast, fetchFn })

  assert.deepEqual(result, { status: 'backend_down', problem: 'HTTP 502' })
  assert.ok(!calls.some((url) => url.endsWith('/db')), 'db must not be checked when the backend is down')
})

test('checkHealth: db_down when the backend is up but the database is not', async () => {
  const { fetchFn } = routedFetch({ '/api/health': [200], '/api/health/db': [503, 503] })

  const result = await checkHealth('https://demo.example', { ...fast, fetchFn })

  assert.deepEqual(result, { status: 'db_down', problem: 'HTTP 503' })
})

test('checkHealth: tolerates a trailing slash in the base URL', async () => {
  const { fetchFn, calls } = routedFetch({ '/api/health': [200], '/api/health/db': [200] })

  await checkHealth('https://demo.example/', { ...fast, fetchFn })

  assert.equal(calls[0], 'https://demo.example/api/health')
})
