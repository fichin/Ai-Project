export const SESSION_COOKIE_NAME = 'session_token'
export const SESSION_TTL_DAYS = 30
export const EMAIL_VERIFICATION_TTL_HOURS = 24
export const PASSWORD_RESET_TTL_MINUTES = 30

export const EMAIL_NOT_VERIFIED_CODE = 'EMAIL_NOT_VERIFIED'
export const EMAIL_NOT_VERIFIED_MESSAGE = 'Please verify your email before accessing your workspace.'

// One-time local migration credential: pre-auth data (created via the old
// temporary dev-user approach) lived under this account. We give it this
// password during the startup migration so that data stays reachable through
// a real login instead of becoming orphaned. Purely a local dev convenience —
// never used for anything beyond this project's own SQLite file.
export const DEV_USER_EMAIL = 'dev@local.test'
export const DEV_USER_MIGRATION_PASSWORD = 'localdev123'
