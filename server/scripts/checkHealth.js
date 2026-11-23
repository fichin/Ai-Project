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
