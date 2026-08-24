export type UxErrorContext =
  | 'auth'
  | 'signup'
  | 'login'
  | 'oauth'
  | 'oauth_callback'
  | 'password_reset'
  | 'verification'
  | 'upload'
  | 'project'
  | 'project_load'
  | 'project_action'
  | 'export'
  | 'render'
  | 'job'
  | 'network'
  | 'generic'

export function getUnknownErrorMessage(error: unknown, fallback = 'Something went wrong.'): string {
  if (error instanceof Error && error.message.trim()) return error.message.trim()
  if (typeof error === 'string' && error.trim()) return error.trim()
  return fallback
}

const DATABASE_ERROR = 'Prometheus hit a database problem while finishing that step. This is on our side — nothing is wrong with your connection. Please try again in a moment.'
const NETWORK_ERROR = 'The connection dropped before Prometheus could finish. Check your network and try again.'

// Every message this module can produce. normalizeUxError is applied on both the
// server (route catch) and the client (form catch), so an already-normalized
// message must pass through unchanged instead of being re-matched against
// keywords it happens to contain.
const CANONICAL_MESSAGES = new Set([
  'That email is already attached to a Prometheus account. Sign in or reset your password to continue.',
  'The email or password does not match our records. Check the details and try again.',
  'Confirm your email before signing in. We can send a fresh verification link.',
  'That secure link is no longer valid. Request a fresh email and use the newest link.',
  'The identity provider could not complete the handoff. Try again in a moment.',
  NETWORK_ERROR,
  'Your session needs a refresh. Sign in again to continue.',
  'That source is too large for this ingestion lane. Choose a smaller video or use the queued upload path.',
  'That file type is not supported here. Upload an MP4, MOV, or WEBM video.',
  'This is taking longer than expected. Prometheus is still watching the job and will reconnect automatically.',
  DATABASE_ERROR,
  'We could not create the account. Check the details and try again.',
  'Choose a stronger password with an uppercase letter, a lowercase letter, a number, and a special character.',
  'You have made too many attempts in a short time. Wait about an hour, then try again.',
  'We could not sign you in. Check the details and try again.',
  'The identity provider handoff did not complete. Try again in a moment.',
  'We could not complete the password reset. Request a fresh link and try again.',
  'We could not verify this email link. Request a fresh one and try again.',
  'We could not stage that source. Choose a supported video and try again.',
  'We could not load this workspace. Refresh the page to try again.',
  'We could not complete that workspace action. Refresh the page and try again.',
  'We could not prepare that export. Try again in a moment.',
  'The preview renderer paused before it could draw this frame.',
  'The render engine did not return a clean status update.',
  'The connection dropped before Prometheus could finish.',
  'Something went wrong. Try again in a moment.',
])

export function normalizeUxError(error: unknown, context: UxErrorContext = 'generic'): string {
  const raw = getUnknownErrorMessage(error, '')

  if (!raw) return fallbackForContext(context)

  if (CANONICAL_MESSAGES.has(raw)) return raw

  const normalized = raw.toLowerCase()

  // Database failures must be classified before everything else. Backend
  // errors leak words like "duplicate", "connection", and "provider" into
  // their messages, and the branches below would mislabel them as an
  // email conflict or a user-side network problem.
  const mentionsMissingRelation =
    (normalized.includes('does not exist') || normalized.includes('doesnt exist')) &&
    (normalized.includes('relation') || normalized.includes('column') || normalized.includes('table') || normalized.includes('schema'))

  if (
    normalized.includes('database error') ||
    normalized.includes('database_error') ||
    normalized.includes('row-level security') ||
    normalized.includes('permission denied') ||
    normalized.includes('permission_denied') ||
    normalized.includes('schema cache') ||
    normalized.includes('unique constraint') ||
    normalized.includes('duplicate key') ||
    normalized.includes('foreign key') ||
    normalized.includes('violates') ||
    normalized.includes('postgres') ||
    mentionsMissingRelation ||
    // Postgres error codes: 42501 RLS, 23505 unique, 23503 FK, 42P01 undefined table
    normalized.includes('42501') ||
    normalized.includes('23505') ||
    normalized.includes('23503') ||
    normalized.includes('42p01')
  ) {
    return DATABASE_ERROR
  }

  if (
    normalized.includes('already registered') ||
    normalized.includes('already exists') ||
    normalized.includes('user already') ||
    normalized.includes('email address is already')
  ) {
    return 'That email is already attached to a Prometheus account. Sign in or reset your password to continue.'
  }

  if (
    normalized.includes('invalid login credentials') ||
    normalized.includes('invalid credentials') ||
    normalized.includes('invalid email or password')
  ) {
    return 'The email or password does not match our records. Check the details and try again.'
  }

  if (
    normalized.includes('weak_password') ||
    normalized.includes('password should contain at least one character of each')
  ) {
    return 'Choose a stronger password with an uppercase letter, a lowercase letter, a number, and a special character.'
  }

  if (
    normalized.includes('rate limit') ||
    normalized.includes('rate_limit') ||
    normalized.includes('over_email_send_rate_limit') ||
    normalized.includes('over_request_rate_limit')
  ) {
    return 'You have made too many attempts in a short time. Wait about an hour, then try again.'
  }

  if (
    normalized.includes('email not confirmed') ||
    normalized.includes('email_not_confirmed') ||
    normalized.includes('confirm your email')
  ) {
    return 'Confirm your email before signing in. We can send a fresh verification link.'
  }

  if (
    normalized.includes('otp_expired') ||
    normalized.includes('expired') ||
    normalized.includes('invalid token') ||
    normalized.includes('invalid or has expired')
  ) {
    return 'That secure link is no longer valid. Request a fresh email and use the newest link.'
  }

  if (
    normalized.includes('popup') ||
    normalized.includes('oauth') ||
    normalized.includes('provider') ||
    normalized.includes('identity provider')
  ) {
    return 'The identity provider could not complete the handoff. Try again in a moment.'
  }

  // Only genuine transport failures land here. Matching the bare substrings
  // "connection" or "network" used to repaint database and backend faults as
  // the user's WiFi dropping.
  if (
    normalized.includes('failed to fetch') ||
    normalized.includes('fetch failed') ||
    normalized.includes('networkerror') ||
    normalized.includes('network request failed') ||
    normalized.includes('load failed') ||
    normalized.includes('net::err') ||
    normalized.includes('econnrefused') ||
    normalized.includes('econnreset') ||
    normalized.includes('connection reset') ||
    normalized.includes('socket hang up')
  ) {
    return NETWORK_ERROR
  }

  if (normalized.includes('unauthorized') || normalized.includes('not authenticated') || normalized.includes('logged in')) {
    return 'Your session needs a refresh. Sign in again to continue.'
  }

  if (normalized.includes('too large') || normalized.includes('file size') || normalized.includes('maxfilesize')) {
    return 'That source is too large for this ingestion lane. Choose a smaller video or use the queued upload path.'
  }

  if (
    normalized.includes('unsupported') ||
    normalized.includes('file type') ||
    normalized.includes('please choose a video') ||
    normalized.includes('mime')
  ) {
    return 'That file type is not supported here. Upload an MP4, MOV, or WEBM video.'
  }

  if (normalized.includes('timed out') || normalized.includes('timeout')) {
    return 'This is taking longer than expected. Prometheus is still watching the job and will reconnect automatically.'
  }

  return fallbackForContext(context)
}

function fallbackForContext(context: UxErrorContext) {
  switch (context) {
    case 'signup':
      return 'We could not create the account. Check the details and try again.'
    case 'login':
      return 'We could not sign you in. Check the details and try again.'
    case 'oauth':
    case 'oauth_callback':
      return 'The identity provider handoff did not complete. Try again in a moment.'
    case 'password_reset':
      return 'We could not complete the password reset. Request a fresh link and try again.'
    case 'verification':
      return 'We could not verify this email link. Request a fresh one and try again.'
    case 'upload':
      return 'We could not stage that source. Choose a supported video and try again.'
    case 'project':
    case 'project_load':
      return 'We could not load this workspace. Refresh the page to try again.'
    case 'project_action':
      return 'We could not complete that workspace action. Refresh the page and try again.'
    case 'export':
      return 'We could not prepare that export. Try again in a moment.'
    case 'render':
      return 'The preview renderer paused before it could draw this frame.'
    case 'job':
      return 'The render engine did not return a clean status update.'
    case 'network':
      return 'The connection dropped before Prometheus could finish.'
    case 'auth':
    case 'generic':
    default:
      return 'Something went wrong. Try again in a moment.'
  }
}
