import { useState } from 'react'
import { useAuth } from '../context/useAuth'
import Button from '../components/Button'
import Avatar from '../components/Avatar'
import { AVATAR_OPTIONS } from '../lib/avatars'
import './Settings.css'

function Settings() {
  const { user, logout, updateProfile } = useAuth()

  const [name, setName] = useState(user?.name ?? '')
  const [avatarId, setAvatarId] = useState(user?.avatarId ?? null)
  const [status, setStatus] = useState('idle') // idle | saving | saved | error
  const [error, setError] = useState(null)

  const isDirty = name.trim() !== (user?.name ?? '') || avatarId !== (user?.avatarId ?? null)

  async function handleSubmit(event) {
    event.preventDefault()

    if (name.trim().length === 0) {
      setStatus('error')
      setError('Name cannot be empty.')
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
          <h1>Settings</h1>
          <p>Manage your account and workspace preferences.</p>
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
