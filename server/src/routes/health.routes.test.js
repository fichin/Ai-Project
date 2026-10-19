import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import http from 'node:http'
import express from 'express'
import { createHealthRouter } from './health.routes.js'

// createHealthRouter takes the pool-getter as a parameter specifically so
// this never has to touch a real database or a real network — a fake
// getPool, swapped in directly rather than through node:test's
// mock.module() (experimental, and observed behaving inconsistently
// between Node versions), is enough to exercise the actual route logic.
function startAppWithFakePool(queryImpl) {
  const router = createHealthRouter(() => ({ query: queryImpl }))
  const app = express()
  app.use('/api', router)
  const server = app.listen(0)
  return server
}

function get(port, path) {
  return new Promise((resolve, reject) => {
    const req = http.request({ port, path }, (res) => {
      let body = ''
      res.on('data', (chunk) => (body += chunk))
      res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(body) }))
    })
    req.on('error', reject)
    req.end()
  })
}

async function closeServer(server) {
  await new Promise((resolve) => server.close(resolve))
}

describe('GET /api/health/db', () => {
  test('returns 200 { status: "ok" } when the database query succeeds', async () => {
    const server = startAppWithFakePool(async () => ({ rows: [{ '?column?': 1 }] }))
    try {
      const port = server.address().port
      const response = await get(port, '/api/health/db')
      assert.equal(response.status, 200)
      assert.deepEqual(response.body, { status: 'ok' })
    } finally {
      await closeServer(server)
    }
  })

  test('returns 503 { status: "error" } when the database query fails, without leaking the error', async () => {
    const secretLookingMessage = 'connection refused: postgresql://user:supersecret@host/db'
    const server = startAppWithFakePool(async () => {
      throw new Error(secretLookingMessage)
    })
    try {
      const port = server.address().port
      const response = await get(port, '/api/health/db')
      assert.equal(response.status, 503)
      assert.deepEqual(response.body, { status: 'error' })
      assert.ok(
        !JSON.stringify(response.body).includes('supersecret'),
        'the response body must never include the underlying error message',
      )
    } finally {
      await closeServer(server)
    }
  })
})
