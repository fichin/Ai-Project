import { afterEach, describe, expect, it } from 'vitest'
import { applyPreferencesToDocument, DEFAULT_PREFERENCES } from './preferences'

afterEach(() => {
  const root = document.documentElement
  root.removeAttribute('data-theme')
  root.removeAttribute('data-accent')
  root.removeAttribute('data-density')
  root.removeAttribute('data-reduced-motion')
})

describe('applyPreferencesToDocument', () => {
  it('sets data-theme on <html> when an explicit theme is chosen', () => {
    applyPreferencesToDocument({ ...DEFAULT_PREFERENCES, theme: 'dark' })

    expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
  })

  it('removes data-theme when theme is "system", so the CSS media query takes over', () => {
    document.documentElement.setAttribute('data-theme', 'dark')

    applyPreferencesToDocument({ ...DEFAULT_PREFERENCES, theme: 'system' })

    expect(document.documentElement.hasAttribute('data-theme')).toBe(false)
  })

  it('always sets data-accent and data-density', () => {
    applyPreferencesToDocument({ ...DEFAULT_PREFERENCES, accent: 'purple', density: 'compact' })

    expect(document.documentElement.getAttribute('data-accent')).toBe('purple')
    expect(document.documentElement.getAttribute('data-density')).toBe('compact')
  })

  it('sets data-reduced-motion to "true" when reducedMotion is enabled', () => {
    applyPreferencesToDocument({ ...DEFAULT_PREFERENCES, reducedMotion: true })

    expect(document.documentElement.getAttribute('data-reduced-motion')).toBe('true')
  })

  it('removes data-reduced-motion when reducedMotion is disabled', () => {
    document.documentElement.setAttribute('data-reduced-motion', 'true')

    applyPreferencesToDocument({ ...DEFAULT_PREFERENCES, reducedMotion: false })

    expect(document.documentElement.hasAttribute('data-reduced-motion')).toBe(false)
  })
})
