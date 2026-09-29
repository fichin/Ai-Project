// Mirrors server/src/config/preferences.js — option ids must match exactly
// since they're sent straight through to PATCH /api/preferences.
export const THEME_OPTIONS = [
  { id: 'dark', label: 'Dark' },
  { id: 'light', label: 'Light' },
  { id: 'system', label: 'System' },
]

export const ACCENT_OPTIONS = [
  { id: 'blue', label: 'Blue' },
  { id: 'purple', label: 'Purple' },
  { id: 'cyan', label: 'Cyan' },
]

export const DENSITY_OPTIONS = [
  { id: 'comfortable', label: 'Comfortable' },
  { id: 'compact', label: 'Compact' },
]

export const LANDING_PAGE_OPTIONS = [
  { id: '/dashboard', label: 'Dashboard' },
  { id: '/assistant', label: 'AI Assistant' },
  { id: '/agents', label: 'Agents' },
  { id: '/projects', label: 'Projects' },
  { id: '/settings', label: 'Settings' },
]

export const DEFAULT_PREFERENCES = {
  theme: 'system',
  accent: 'blue',
  density: 'comfortable',
  sidebarCollapsed: false,
  defaultLandingPage: '/dashboard',
  reducedMotion: false,
}

// Reflects the current preferences onto <html> as data-attributes so the
// CSS in index.css (theme/accent/density/motion blocks) can react — see
// PreferencesProvider, the single place that calls this.
export function applyPreferencesToDocument(preferences) {
  const root = document.documentElement

  if (preferences.theme === 'system') {
    root.removeAttribute('data-theme')
  } else {
    root.setAttribute('data-theme', preferences.theme)
  }

  root.setAttribute('data-accent', preferences.accent)
  root.setAttribute('data-density', preferences.density)

  if (preferences.reducedMotion) {
    root.setAttribute('data-reduced-motion', 'true')
  } else {
    root.removeAttribute('data-reduced-motion')
  }
}
