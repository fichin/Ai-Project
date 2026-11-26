import { describe, expect, it } from 'vitest'
import { formatDate, parseApiDate } from './formatDate'

const INSTANT = '2026-11-26T10:00:00.000Z'

describe('parseApiDate', () => {
  it('reads the ISO format the API sends after the timestamptz migration', () => {
    expect(parseApiDate(INSTANT).toISOString()).toBe(INSTANT)
  })

  it('reads the old "YYYY-MM-DD HH:MM:SS" text as UTC, not local time', () => {
    expect(parseApiDate('2026-11-26 10:00:00').toISOString()).toBe(INSTANT)
  })

  it('returns null for missing or unparseable values instead of an Invalid Date', () => {
    expect(parseApiDate(null)).toBeNull()
    expect(parseApiDate('')).toBeNull()
    expect(parseApiDate('not a date')).toBeNull()
    // The exact string the old formatDate built from an ISO value.
    expect(parseApiDate(`${INSTANT}Z`)).toBeNull()
  })
})

describe('formatDate', () => {
  it('formats both API formats to the same text', () => {
    const options = { dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC' }
    expect(formatDate(INSTANT, options)).toBe(formatDate('2026-11-26 10:00:00', options))
    expect(formatDate(INSTANT, options)).not.toMatch(/invalid/i)
  })

  it('returns null when there is no date', () => {
    expect(formatDate(null)).toBeNull()
  })
})
