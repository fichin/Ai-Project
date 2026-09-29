export const THEMES = ['dark', 'light', 'system']
export const ACCENTS = ['blue', 'purple', 'cyan']
export const DENSITIES = ['comfortable', 'compact']

// Mirrors AppSidebar's NAV_ITEMS — the only routes it makes sense to land on
// after login.
export const LANDING_PAGES = ['/dashboard', '/assistant', '/agents', '/projects', '/settings']

export const DEFAULT_PREFERENCES = {
  theme: 'system',
  accent: 'blue',
  density: 'comfortable',
  sidebarCollapsed: false,
  defaultLandingPage: '/dashboard',
  reducedMotion: false,
}
