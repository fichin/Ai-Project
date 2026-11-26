import { test } from 'node:test'
import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { fileURLToPath } from 'node:url'

const run = promisify(execFile)
const script = fileURLToPath(new URL('./migrate.js', import.meta.url))

test('without --yes it only prints the target and never connects', async () => {
  // .invalid never resolves, so any connection attempt would fail the run.
  const { stdout } = await run(process.execPath, [script], {
    env: { ...process.env, DATABASE_URL: 'postgres://user:secret@db.example.invalid:6543/postgres' },
  })

  assert.match(stdout, /Target database: db\.example\.invalid:6543\/postgres/)
  assert.match(stdout, /Nothing changed/)
  assert.doesNotMatch(stdout, /secret/)
})

test('--baseline without --yes refuses before connecting', async () => {
  const { stdout } = await run(process.execPath, [script, '--baseline'], {
    env: { ...process.env, DATABASE_URL: 'postgres://user:secret@db.example.invalid:6543/postgres' },
  })

  assert.match(stdout, /--baseline writes to the database: add --yes/)
})
