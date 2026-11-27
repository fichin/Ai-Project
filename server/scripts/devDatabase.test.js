import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import pg from 'pg'
import { startDevDatabase } from './devDatabase.js'
import { sslFor, setPostgresPoolForTests, closePostgresPool } from '../src/db/postgresClient.js'
import { assertSafeDevDatabase } from '../src/config/databaseGuard.js'
import { createApp } from '../src/app.js'
import { createUser, getUserByEmail } from '../src/db/usersRepository.js'

const port = 55000 + Math.floor(Math.random() * 5000)
let dataDir

before(async () => {
  dataDir = await mkdtemp(path.join(tmpdir(), 'dev-db-test-'))
})

after(async () => {
  await rm(dataDir, { recursive: true, force: true })
})

test('first start migrates, the app works over it, and the data survives a restart', async () => {
  const first = await startDevDatabase({ dataDir, port })
  try {
    assert.deepEqual(first.applied, ['0001_baseline.sql', '0002_timestamptz.sql', '0003_drop_dev_outbox_emails.sql'])

    // The URL it prints must pass both step-1 and step-2 rules.
    assert.equal(sslFor(first.databaseUrl), false)
    assertSafeDevDatabase({ databaseUrl: first.databaseUrl, nodeEnv: 'development', onRender: false, devSupabaseRef: '' })

    // Same driver and settings the app uses, so this is the real path.
    setPostgresPoolForTests(new pg.Pool({ connectionString: first.databaseUrl, ssl: sslFor(first.databaseUrl), max: 1 }))
    const server = createApp().listen(0)
    try {
      const res = await fetch(`http://127.0.0.1:${server.address().port}/api/health/db`)
      assert.equal(res.status, 200)
      assert.deepEqual(await res.json(), { status: 'ok' })
    } finally {
      await new Promise((resolve) => server.close(resolve))
    }

    const user = await createUser({ email: 'dev@example.com', name: 'Dev', passwordHash: 'x' })
    assert.ok(user.created_at instanceof Date)
  } finally {
    await closePostgresPool()
    await first.stop()
  }

  const second = await startDevDatabase({ dataDir, port })
  try {
    assert.deepEqual(second.applied, [], 'migrations must not run twice')
    setPostgresPoolForTests(new pg.Pool({ connectionString: second.databaseUrl, ssl: false, max: 1 }))
    const user = await getUserByEmail('dev@example.com')
    assert.equal(user?.name, 'Dev')
  } finally {
    await closePostgresPool()
    await second.stop()
  }
})

test('a busy port fails clearly and leaves the database closed', async () => {
  const blocker = await startDevDatabase({ dataDir: 'memory://', port })
  try {
    await assert.rejects(startDevDatabase({ dataDir: 'memory://', port }), { code: 'EADDRINUSE' })
  } finally {
    await blocker.stop()
  }
})
