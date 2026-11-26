import { test } from 'node:test'
import assert from 'node:assert/strict'
import { formatRelativeTime } from './formatRelativeTime.js'

const MINUTE = 60 * 1000
const ago = (ms) => new Date(Date.now() - ms)

test('formats Date objects relative to now', () => {
  assert.equal(formatRelativeTime(ago(10 * 1000)), 'Just now')
  assert.equal(formatRelativeTime(ago(MINUTE)), '1 minute ago')
  assert.equal(formatRelativeTime(ago(5 * MINUTE)), '5 minutes ago')
  assert.equal(formatRelativeTime(ago(3 * 60 * MINUTE)), '3 hours ago')
  assert.equal(formatRelativeTime(ago(2 * 24 * 60 * MINUTE)), '2 days ago')
  assert.equal(formatRelativeTime(ago(14 * 24 * 60 * MINUTE)), '2 weeks ago')
})

test('does not depend on the server time zone', () => {
  // The same instant written with two different offsets.
  const utc = new Date('2026-11-26T10:00:00Z')
  const skopje = new Date('2026-11-26T11:00:00+01:00')

  assert.equal(formatRelativeTime(utc), formatRelativeTime(skopje))
})
