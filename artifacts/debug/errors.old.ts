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

export function normalizeUxError(error: unknown, context: UxErrorContext = 'generic'): string {
  const raw = getUnknownErrorMessage(error, '')
  const normalized = raw.toLowerCase()

  if (!raw) return fallbackForContext(context)

  if (
    normalized.includes('already registered') ||
    normalized.includes('already exists') ||
    normalized.includes('duplicate') ||
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

  if (
    normalized.includes('network') ||
    normalized.includes('failed to fetch') ||
    normalized.includes('load failed') ||
    normalized.includes('connection')
  ) {
    return 'The connection dropped before Prometheus could finish. Check your network and try again.'
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
