import { Router } from 'express'
import { getPreferencesForUser, updatePreferencesForUser } from '../db/preferencesRepository.js'
import { logActivity } from '../db/activityRepository.js'
import { ACTIVITY_TYPES } from '../config/activity.js'
import { THEMES, ACCENTS, DENSITIES, LANDING_PAGES } from '../config/preferences.js'
import { asyncHandler } from '../utils/asyncHandler.js'

const router = Router()

router.get(
  '/preferences',
  asyncHandler(async (req, res) => {
    res.json(await getPreferencesForUser(req.user.id))
  }),
)

router.patch(
  '/preferences',
  asyncHandler(async (req, res) => {
    const { theme, accent, density, sidebarCollapsed, defaultLandingPage, reducedMotion } = req.body ?? {}
    const fields = {}

    if (theme !== undefined) {
      if (!THEMES.includes(theme)) {
        return res.status(400).json({ error: `"theme" must be one of: ${THEMES.join(', ')}.` })
      }
      fields.theme = theme
    }

    if (accent !== undefined) {
      if (!ACCENTS.includes(accent)) {
        return res.status(400).json({ error: `"accent" must be one of: ${ACCENTS.join(', ')}.` })
      }
      fields.accent = accent
    }

    if (density !== undefined) {
      if (!DENSITIES.includes(density)) {
        return res.status(400).json({ error: `"density" must be one of: ${DENSITIES.join(', ')}.` })
      }
      fields.density = density
    }

    if (sidebarCollapsed !== undefined) {
      if (typeof sidebarCollapsed !== 'boolean') {
        return res.status(400).json({ error: '"sidebarCollapsed" must be a boolean.' })
      }
      fields.sidebarCollapsed = sidebarCollapsed
    }

    if (defaultLandingPage !== undefined) {
      if (!LANDING_PAGES.includes(defaultLandingPage)) {
        return res.status(400).json({ error: `"defaultLandingPage" must be one of: ${LANDING_PAGES.join(', ')}.` })
      }
      fields.defaultLandingPage = defaultLandingPage
    }

    if (reducedMotion !== undefined) {
      if (typeof reducedMotion !== 'boolean') {
        return res.status(400).json({ error: '"reducedMotion" must be a boolean.' })
      }
      fields.reducedMotion = reducedMotion
    }

    if (Object.keys(fields).length === 0) {
      return res.status(400).json({ error: 'At least one editable field must be provided.' })
    }

    const updated = await updatePreferencesForUser(req.user.id, fields)
    await logActivity(req.user.id, { type: ACTIVITY_TYPES.PREFERENCES_UPDATED })
    res.json(updated)
  }),
)

export default router
