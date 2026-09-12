// Built-in avatar catalog for the profile picker. Ids must match the
// server's AVATAR_IDS allow-list (server/src/config/avatars.js) — the id is
// all that's persisted, the emoji/label are purely presentational.
export const AVATAR_OPTIONS = [
  { id: 'robot', emoji: '🤖', label: 'Robot' },
  { id: 'ninja', emoji: '🥷', label: 'Ninja' },
  { id: 'dragon', emoji: '🐉', label: 'Dragon' },
  { id: 'fox', emoji: '🦊', label: 'Fox' },
  { id: 'alien', emoji: '👽', label: 'Alien' },
  { id: 'frog', emoji: '🐸', label: 'Frog' },
  { id: 'space', emoji: '🚀', label: 'Space' },
  { id: 'brain', emoji: '🧠', label: 'Brain' },
  { id: 'cool', emoji: '😎', label: 'Cool' },
  { id: 'lightning', emoji: '⚡', label: 'Lightning' },
  { id: 'energy', emoji: '🔥', label: 'Energy' },
  { id: 'initials', emoji: null, label: 'Initials' },
]

export function getAvatarEmoji(avatarId) {
  return AVATAR_OPTIONS.find((option) => option.id === avatarId)?.emoji ?? null
}
