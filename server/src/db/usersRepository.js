import { getDb } from './index.js'

export function getUserByEmail(email) {
  return getDb().prepare('SELECT * FROM users WHERE email = ?').get(email)
}

export function getUserById(id) {
  return getDb().prepare('SELECT * FROM users WHERE id = ?').get(id)
}

export function createUser({ email, name, passwordHash }) {
  const db = getDb()
  const result = db
    .prepare('INSERT INTO users (email, name, password_hash) VALUES (?, ?, ?)')
    .run(email, name, passwordHash)

  return getUserById(Number(result.lastInsertRowid))
}

export function updateUserPassword(userId, passwordHash) {
  getDb()
    .prepare(`UPDATE users SET password_hash = ?, updated_at = datetime('now') WHERE id = ?`)
    .run(passwordHash, userId)
}

// Partial update: only the fields present in `fields` are changed, the rest
// keep their current value (same merge pattern as projectsRepository).
export function updateUserProfile(userId, fields) {
  const current = getUserById(userId)
  if (!current) {
    return null
  }

  const name = fields.name ?? current.name
  const avatarId = fields.avatarId !== undefined ? fields.avatarId : current.avatar_id

  getDb()
    .prepare(`UPDATE users SET name = ?, avatar_id = ?, updated_at = datetime('now') WHERE id = ?`)
    .run(name, avatarId, userId)

  return getUserById(userId)
}

export function markEmailVerified(userId) {
  getDb().prepare(`UPDATE users SET email_verified_at = datetime('now') WHERE id = ?`).run(userId)
}
