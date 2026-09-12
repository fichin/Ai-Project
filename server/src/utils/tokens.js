import { randomBytes, createHash } from 'node:crypto'

// The raw token is only ever given to the caller (put in a URL/cookie); only
// its hash is ever persisted, so reading the database alone never yields a
// usable token.
export function generateToken() {
  return randomBytes(32).toString('hex')
}

export function hashToken(token) {
  return createHash('sha256').update(token).digest('hex')
}
