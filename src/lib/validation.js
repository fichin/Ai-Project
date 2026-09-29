// Tiny, pure field-validator functions shared by every form in the app
// (Project/Agent forms, Register, ForgotPassword, ResetPassword, Settings'
// profile form) — each previously re-implemented the same
// `value.trim().length === 0` / `value.length < n` / `a !== b` checks
// inline. What fields exist, which validators apply to them, in what
// order, and the exact message shown all stay in each form — this file
// only removes the repeated low-level comparisons.
export function required(value, message) {
  return String(value ?? '').trim().length === 0 ? message : null
}

export function minLength(value, min, message) {
  return String(value ?? '').length < min ? message : null
}

export function matches(value, other, message) {
  return value !== other ? message : null
}

// Checked in order so the message always names the single most basic thing
// still missing, rather than a generic "invalid password" — e.g. a 5-char
// all-lowercase password reports the length first, not the missing
// uppercase/number too.
export function passwordStrength(value) {
  const v = String(value ?? '')
  if (v.length < 8) return 'Password must be at least 8 characters.'
  if (!/[A-Z]/.test(v)) return 'Password must include at least one uppercase letter.'
  if (!/[0-9]/.test(v)) return 'Password must include at least one number.'
  return null
}

// Runs each already-evaluated check and returns the first non-null message,
// or null if every check passed — e.g.
// firstError(required(name, 'Name is required.'), minLength(password, 8, '...'))
export function firstError(...checks) {
  for (const check of checks) {
    if (check) return check
  }
  return null
}
