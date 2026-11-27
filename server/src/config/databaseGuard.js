import { isLocalHost } from '../db/postgresClient.js'

export class UnsafeDatabaseError extends Error {}

// Supabase has two URL shapes: the direct host carries the project ref
// (db.<ref>.supabase.co), the pooler carries it in the user name
// (postgres.<ref>@...pooler.supabase.com). '' means "Supabase, ref unknown".
export function supabaseRefOf(url) {
  const host = url.hostname
  const direct = /^db\.([a-z0-9]+)\.supabase\.co$/.exec(host)
  if (direct) return direct[1]
  if (host.endsWith('.pooler.supabase.com')) {
    const [, ref = ''] = decodeURIComponent(url.username).split('.')
    return ref.toLowerCase()
  }
  if (host.endsWith('.supabase.co') || host.endsWith('.supabase.com')) return ''
  return null
}

// Local development once ran against the production database. Production
// itself (NODE_ENV=production, or Render's RENDER variable) is never blocked:
// a guard that can take the live site down is worse than the risk it covers.
export function assertSafeDevDatabase({ databaseUrl, nodeEnv, onRender, devSupabaseRef }) {
  if (nodeEnv === 'production' || onRender) return
  if (!databaseUrl) return

  let url
  try {
    url = new URL(databaseUrl)
  } catch {
    throw new UnsafeDatabaseError('DATABASE_URL is not a valid URL, so it cannot be checked. Refusing to start.')
  }
  if (isLocalHost(url.hostname)) return

  // Allow-list: the dev Supabase project by its ref, nothing else remote.
  // A non-Supabase host (ref null) is refused too: production could sit
  // behind an IP or another provider, and "not Supabase" isn't "safe".
  const ref = supabaseRefOf(url)
  if (devSupabaseRef && ref === devSupabaseRef) return

  // Host only: the full URL contains the password.
  throw new UnsafeDatabaseError(
    `DATABASE_URL points at ${url.hostname}, which is not a local or development database. ` +
      'Run "npm run db:dev" and use the URL it prints, or set DEV_DATABASE_SUPABASE_REF ' +
      'to the ref of your development Supabase project.',
  )
}
