import { useState } from 'react'
import { useAuth } from '../context/useAuth'
import { usePreferences } from '../context/usePreferences'
import Button from '../components/Button'
import Avatar from '../components/Avatar'
import { AVATAR_OPTIONS } from '../lib/avatars'
import { THEME_OPTIONS, ACCENT_OPTIONS, DENSITY_OPTIONS, LANDING_PAGE_OPTIONS } from '../lib/preferences'
import { required } from '../lib/validation'
import './Settings.css'

function Settings() {
  const { user, logout, updateProfile } = useAuth()
  const { preferences, updatePreferences } = usePreferences()

  const [prefsError, setPrefsError] = useState(null)
  const [savingKey, setSavingKey] = useState(null)

  async function handlePrefChange(key, value) {
    setPrefsError(null)
    setSavingKey(key)
    try {
      await updatePreferences({ [key]: value })
    } catch (err) {
      setPrefsError(err.message)
    } finally {
      setSavingKey(null)
    }
  }

  const [name, setName] = useState(user?.name ?? '')
  const [avatarId, setAvatarId] = useState(user?.avatarId ?? null)
  const [status, setStatus] = useState('idle') // idle | saving | saved | error
  const [error, setError] = useState(null)

  const isDirty = name.trim() !== (user?.name ?? '') || avatarId !== (user?.avatarId ?? null)

  async function handleSubmit(event) {
    event.preventDefault()

    const validationError = required(name, 'Name cannot be empty.')
    if (validationError) {
      setStatus('error')
      setError(validationError)
      return
    }

    setStatus('saving')
    setError(null)
    try {
      await updateProfile({ name: name.trim(), avatarId })
      setStatus('saved')
    } catch (err) {
      setStatus('error')
      setError(err.message)
    }
  }

  return (
    <div className="settings-page">
      <div className="settings-container">
        <div className="settings-header">
          <h1 className="page-title">Settings</h1>
          <p className="page-subtitle">Manage your account and workspace preferences.</p>
        </div>

        <form className="settings-card" onSubmit={handleSubmit}>
          <h2>Profile</h2>

          {error && <p className="settings-form-error">{error}</p>}

          <label className="settings-field">
            Name
            <input
              type="text"
              value={name}
              onChange={(event) => {
                setName(event.target.value)
                setStatus('idle')
              }}
              maxLength={80}
              required
            />
          </label>

          <label className="settings-field">
            Email
            <input type="email" value={user?.email ?? ''} disabled readOnly />
          </label>

          <div className="settings-field">
            <span>Avatar</span>
            <div className="settings-avatar-grid">
              {AVATAR_OPTIONS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  className={`settings-avatar-option ${avatarId === option.id ? 'settings-avatar-option-selected' : ''}`}
                  onClick={() => {
                    setAvatarId(option.id)
                    setStatus('idle')
                  }}
                  title={option.label}
                  aria-label={option.label}
                  aria-pressed={avatarId === option.id}
                >
                  <Avatar name={name} avatarId={option.id} size={40} />
                </button>
              ))}
            </div>
          </div>

          <div className="settings-form-actions">
            {status === 'saved' && !isDirty && <span className="settings-form-status">Saved</span>}
            <Button type="submit" variant="primary" disabled={status === 'saving' || !isDirty}>
              {status === 'saving' ? 'Saving...' : 'Save changes'}
            </Button>
          </div>
        </form>

        <div className="settings-card">
          <h2>Preferences</h2>

          {prefsError && <p className="settings-form-error">{prefsError}</p>}

          <div className="settings-field">
            <span>Appearance</span>
            <div className="settings-option-group" role="radiogroup" aria-label="Appearance">
              {THEME_OPTIONS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  role="radio"
                  aria-checked={preferences.theme === option.id}
                  className={`settings-option-button ${preferences.theme === option.id ? 'settings-option-button-active' : ''}`}
                  onClick={() => handlePrefChange('theme', option.id)}
                  disabled={savingKey === 'theme'}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className="settings-field">
            <span>Accent</span>
            <div className="settings-accent-group" role="radiogroup" aria-label="Accent color">
              {ACCENT_OPTIONS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  role="radio"
                  aria-checked={preferences.accent === option.id}
                  aria-label={option.label}
                  title={option.label}
                  data-accent-swatch={option.id}
                  className={`settings-accent-swatch ${preferences.accent === option.id ? 'settings-accent-swatch-active' : ''}`}
                  onClick={() => handlePrefChange('accent', option.id)}
                  disabled={savingKey === 'accent'}
                />
              ))}
            </div>
          </div>

          <div className="settings-field">
            <span>Layout</span>
            <div className="settings-option-group" role="radiogroup" aria-label="Layout density">
              {DENSITY_OPTIONS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  role="radio"
                  aria-checked={preferences.density === option.id}
                  className={`settings-option-button ${preferences.density === option.id ? 'settings-option-button-active' : ''}`}
                  onClick={() => handlePrefChange('density', option.id)}
                  disabled={savingKey === 'density'}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className="settings-field">
            <span>Sidebar</span>
            <div className="settings-option-group" role="radiogroup" aria-label="Sidebar">
              <button
                type="button"
                role="radio"
                aria-checked={!preferences.sidebarCollapsed}
                className={`settings-option-button ${!preferences.sidebarCollapsed ? 'settings-option-button-active' : ''}`}
                onClick={() => handlePrefChange('sidebarCollapsed', false)}
                disabled={savingKey === 'sidebarCollapsed'}
              >
                Expanded
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={preferences.sidebarCollapsed}
                className={`settings-option-button ${preferences.sidebarCollapsed ? 'settings-option-button-active' : ''}`}
                onClick={() => handlePrefChange('sidebarCollapsed', true)}
                disabled={savingKey === 'sidebarCollapsed'}
              >
                Collapsed
              </button>
            </div>
          </div>

          <label className="settings-field">
            Default landing page
            <select
              value={preferences.defaultLandingPage}
              onChange={(event) => handlePrefChange('defaultLandingPage', event.target.value)}
              disabled={savingKey === 'defaultLandingPage'}
            >
              {LANDING_PAGE_OPTIONS.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="settings-checkbox-field">
            <input
              type="checkbox"
              checked={preferences.reducedMotion}
              onChange={(event) => handlePrefChange('reducedMotion', event.target.checked)}
              disabled={savingKey === 'reducedMotion'}
            />
            Reduce motion
          </label>
        </div>

        <div className="settings-card">
          <h2>Session</h2>
          <p className="settings-description">Sign out of AI Project on this device.</p>
          <Button variant="secondary" onClick={logout}>
            Log out
          </Button>
        </div>
      </div>
    </div>
  )
}

export default Settings
