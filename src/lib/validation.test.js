import { describe, expect, it } from 'vitest'
import { required, minLength, matches, firstError, passwordStrength } from './validation'

describe('required', () => {
  it('returns the message for an empty string', () => {
    expect(required('', 'Name is required.')).toBe('Name is required.')
  })

  it('returns the message for a whitespace-only string', () => {
    expect(required('   ', 'Name is required.')).toBe('Name is required.')
  })

  it('returns the message for null/undefined', () => {
    expect(required(null, 'Name is required.')).toBe('Name is required.')
    expect(required(undefined, 'Name is required.')).toBe('Name is required.')
  })

  it('returns null for a non-empty value', () => {
    expect(required('Ada', 'Name is required.')).toBeNull()
  })
})

describe('minLength', () => {
  it('returns the message when the value is shorter than min', () => {
    expect(minLength('abc', 8, 'Too short.')).toBe('Too short.')
  })

  it('returns null when the value meets min', () => {
    expect(minLength('abcdefgh', 8, 'Too short.')).toBeNull()
  })

  it('returns null when the value exceeds min', () => {
    expect(minLength('abcdefghi', 8, 'Too short.')).toBeNull()
  })
})

describe('matches', () => {
  it('returns the message when values differ', () => {
    expect(matches('abc', 'xyz', 'Passwords do not match.')).toBe('Passwords do not match.')
  })

  it('returns null when values are equal', () => {
    expect(matches('abc', 'abc', 'Passwords do not match.')).toBeNull()
  })
})

describe('passwordStrength', () => {
  it('reports the length requirement for a too-short password', () => {
    expect(passwordStrength('Ab1')).toBe('Password must be at least 8 characters.')
  })

  it('reports the length requirement before other checks even if longer checks would also fail', () => {
    // 7 chars, no uppercase, no number — length is still the message that
    // comes back, since it's checked first.
    expect(passwordStrength('abcdefg')).toBe('Password must be at least 8 characters.')
  })

  it('reports the missing uppercase letter once length is satisfied', () => {
    expect(passwordStrength('abcdefg1')).toBe('Password must include at least one uppercase letter.')
  })

  it('reports the missing number once length and uppercase are satisfied', () => {
    expect(passwordStrength('Abcdefgh')).toBe('Password must include at least one number.')
  })

  it('returns null for a password meeting every requirement', () => {
    expect(passwordStrength('Abcdefg1')).toBeNull()
  })

  it('returns the length message for an empty/null/undefined value', () => {
    expect(passwordStrength('')).toBe('Password must be at least 8 characters.')
    expect(passwordStrength(null)).toBe('Password must be at least 8 characters.')
    expect(passwordStrength(undefined)).toBe('Password must be at least 8 characters.')
  })
})

describe('firstError', () => {
  it('returns null when every check passes', () => {
    expect(firstError(null, null, null)).toBeNull()
  })

  it('returns the first non-null message', () => {
    expect(firstError(null, 'Second error.', 'Third error.')).toBe('Second error.')
  })

  it('returns null when called with no checks', () => {
    expect(firstError()).toBeNull()
  })
})
