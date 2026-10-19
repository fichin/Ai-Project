import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import http from 'node:http'
import express from 'express'
import { env } from '../config/env.js'
import { loginLimiter, loginPerEmailLimiter } from './rateLimiters.js'

// Mirrors how app.js wires this up in production: exactly one trusted
// proxy hop, so req.ip resolves to the LAST X-Forwarded-For entry (the one
// Render's own proxy appends) no matter what a client prepends to the
// front of that header.
function startTestApp() {
  const app = express()
  app.set('trust proxy', 1)
  app.get('/probe', loginLimiter, (req, res) => res.json({ ip: req.ip }))
  const server = app.listen(0)
  return server
}

function get(port, xForwardedFor) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      { port, path: '/probe', headers: { 'X-Forwarded-For': xForwardedFor } },
      (res) => {
        let body = ''
        res.on('data', (chunk) => (body += chunk))
        res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(body) }))
      },
    )
    req.on('error', reject)
    req.end()
  })
}

async function closeServer(server) {
  await new Promise((resolve) => server.close(resolve))
}

// No trust-proxy setup needed here — this limiter is keyed by the email in
// the request body, not req.ip, which is exactly the point: it shouldn't
// matter what IP (real or spoofed) a request claims to come from. Responds
// 401, not 200: skipSuccessfulRequests only excludes successful responses
// from the count, so the test has to mimic a real failed-login response to
// actually exercise "10 failed attempts" rather than silently never
// counting anything.
function startPerEmailTestApp() {
  const app = express()
  app.use(express.json())
  app.post('/probe', loginPerEmailLimiter, (req, res) => res.status(401).json({ email: req.body.email }))
  const server = app.listen(0)
  return server
}

function post(port, body, xForwardedFor) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body)
    const req = http.request(
      {
        port,
        path: '/probe',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(data),
          ...(xForwardedFor ? { 'X-Forwarded-For': xForwardedFor } : {}),
        },
      },
      (res) => {
        let resBody = ''
        res.on('data', (chunk) => (resBody += chunk))
        res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(resBody) }))
      },
    )
    req.on('error', reject)
    req.write(data)
    req.end()
  })
}

describe('rate limiting is keyed by the trusted (last) X-Forwarded-For hop', () => {
  test('rotating the spoofed first entry does not reset or bypass the limit', async () => {
    const server = startTestApp()
    try {
      const port = server.address().port
      const realClientIp = '203.0.113.9'
      const max = env.rateLimits.login.max

      for (let i = 0; i < max; i++) {
        const spoofedFirstEntry = `10.${i % 256}.${i}.${i}`
        const response = await get(port, `${spoofedFirstEntry}, ${realClientIp}`)
        assert.equal(response.status, 200, `request ${i + 1} should succeed`)
        assert.equal(response.body.ip, realClientIp, 'req.ip must resolve to the trusted last entry')
      }

      // One more request, again with a brand-new spoofed first entry, must
      // still be rejected — proving the attacker-controlled part of the
      // header has no influence over which rate-limit bucket is used.
      const oneMore = await get(port, `6.6.6.6, ${realClientIp}`)
      assert.equal(oneMore.status, 429, 'exceeding the limit must 429 even with a fresh spoofed first entry')
      assert.equal(oneMore.body.error, 'Too many login attempts. Please wait a while before trying again.')
    } finally {
      await closeServer(server)
    }
  })

  test('a different real (last-hop) client gets its own, unaffected bucket', async () => {
    const server = startTestApp()
    try {
      const port = server.address().port
      const anotherRealClientIp = '203.0.113.10'

      // Exhaust this client's own limit first, under a spoofed first entry,
      // to prove this bucket is independent of the one used above.
      const max = env.rateLimits.login.max
      for (let i = 0; i < max; i++) {
        const response = await get(port, `172.16.0.${i}, ${anotherRealClientIp}`)
        assert.equal(response.status, 200)
      }

      const stillOk = await get(port, `9.9.9.9, ${anotherRealClientIp}`)
      assert.equal(stillOk.status, 429, 'this client should now be limited on its own bucket')
    } finally {
      await closeServer(server)
    }
  })
})

describe('per-email rate limiting does not depend on the client IP', () => {
  test('the same email hits 429 after the limit, even from a different simulated IP each time', async () => {
    const server = startPerEmailTestApp()
    try {
      const port = server.address().port
      const email = 'victim@example.com'
      const max = env.rateLimits.loginPerEmail.max

      for (let i = 0; i < max; i++) {
        const simulatedIp = `203.0.113.${i + 1}`
        const response = await post(port, { email, password: 'wrong' }, simulatedIp)
        assert.equal(response.status, 401, `attempt ${i + 1} should still be a normal failed-login response`)
      }

      // A brand-new simulated IP, never used above, must not grant a fresh
      // bucket — only the email matters for this limiter.
      const oneMore = await post(port, { email, password: 'wrong' }, '198.51.100.250')
      assert.equal(oneMore.status, 429, 'exceeding the per-email limit must 429 regardless of the request IP')
      assert.equal(
        oneMore.body.error,
        'Too many failed login attempts for this account. Please wait a while before trying again.',
      )
    } finally {
      await closeServer(server)
    }
  })

  test('a different email is unaffected by another email already being rate-limited', async () => {
    const server = startPerEmailTestApp()
    try {
      const port = server.address().port
      const targetedEmail = 'targeted@example.com'
      const otherEmail = 'other@example.com'
      const max = env.rateLimits.loginPerEmail.max

      for (let i = 0; i < max; i++) {
        const response = await post(port, { email: targetedEmail, password: 'wrong' }, `203.0.113.${i + 1}`)
        assert.equal(response.status, 401)
      }
      const targetedIsBlocked = await post(port, { email: targetedEmail, password: 'wrong' }, '203.0.113.250')
      assert.equal(targetedIsBlocked.status, 429, 'the targeted email should now be rate-limited')

      // Same (already-used) IP, but a different email — must get its own,
      // unaffected bucket.
      const otherStillOk = await post(port, { email: otherEmail, password: 'wrong' }, '203.0.113.1')
      assert.equal(otherStillOk.status, 401, "a different email must not be affected by another email's limit")
    } finally {
      await closeServer(server)
    }
  })
})
