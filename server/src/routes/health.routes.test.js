import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import http from 'node:http'
import express from 'express'

// Mocks db/postgresClient.js's getPostgresPool so this never touches a
// real database — only the query function's behavior is faked, exercising
// the actual route handler in health.routes.js as-is. Each test imports
// the router through a distinct query-string specifier so Node treats it
// as a fresh module instance bound to that test's own mock, rather than
// reusing a module cached (with an earlier test's mock baked in) from a
// previous dynamic import of the same path.
async function loadHealthRoutesWithMockedPool(t, queryImpl) {
  t.mock.module('../db/postgresClient.js', {
    exports: {
      getPostgresPool: () => ({ query: queryImpl }),
    },
  })
  const { default: healthRoutes } = await import(`./health.routes.js?case=${Math.random()}`)
  return healthRoutes
}

function startAppWithRouter(router) {
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
  test('returns 200 { status: "ok" } when the database query succeeds', async (t) => {
    const healthRoutes = await loadHealthRoutesWithMockedPool(t, async () => ({ rows: [{ '?column?': 1 }] }))
    const server = startAppWithRouter(healthRoutes)
    try {
      const port = server.address().port
      const response = await get(port, '/api/health/db')
      assert.equal(response.status, 200)
      assert.deepEqual(response.body, { status: 'ok' })
    } finally {
      await closeServer(server)
    }
  })

  test('returns 503 { status: "error" } when the database query fails, without leaking the error', async (t) => {
    const secretLookingMessage = 'connection refused: postgresql://user:supersecret@host/db'
    const healthRoutes = await loadHealthRoutesWithMockedPool(t, async () => {
      throw new Error(secretLookingMessage)
    })
    const server = startAppWithRouter(healthRoutes)
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
