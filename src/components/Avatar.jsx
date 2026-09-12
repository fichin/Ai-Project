import { getAvatarEmoji } from '../lib/avatars'
import './Avatar.css'

function initials(name) {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/)
  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
}

// Shared circular avatar: shows the user's chosen emoji avatar, or falls
// back to their initials (matching the app's pre-existing sidebar look) if
// they haven't picked one yet, or picked "Initials" explicitly.
function Avatar({ name, avatarId, size = 34 }) {
  const emoji = getAvatarEmoji(avatarId)

  return (
    <span
      className="avatar"
      style={{ width: size, height: size, fontSize: emoji ? Math.round(size * 0.55) : Math.round(size * 0.35) }}
    >
      {emoji ?? initials(name)}
    </span>
  )
}

export default Avatar
