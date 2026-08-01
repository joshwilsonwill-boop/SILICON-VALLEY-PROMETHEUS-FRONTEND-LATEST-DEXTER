export const ONBOARDING_OPEN_EVENT = 'prometheus:open-onboarding'

const PENDING_KEY = 'prometheus:onboarding:pending'
const COMPLETED_KEY_PREFIX = 'prometheus:onboarding:completed:'
const SURFACE_COMPLETED_KEY_PREFIX = 'prometheus:onboarding:surface:completed:'

export type OnboardingSurface = 'studio' | 'editorial'

type PendingOnboarding = {
  email: string | null
  createdAt: number
}

function canUseStorage() {
  return typeof window !== 'undefined'
}

export function markOnboardingPending(email?: string) {
  if (!canUseStorage()) return
  window.localStorage.setItem(PENDING_KEY, JSON.stringify({ email: email?.trim().toLowerCase() || null, createdAt: Date.now() } satisfies PendingOnboarding))
}

export function consumeOnboardingPending(userEmail: string | null | undefined, userCreatedAt?: string | null) {
  if (!canUseStorage() || !userEmail) return false

  try {
    const pending = JSON.parse(window.localStorage.getItem(PENDING_KEY) ?? 'null') as PendingOnboarding | null
    const matchesUser = pending?.email
      ? pending.email === userEmail.trim().toLowerCase()
      : Boolean(userCreatedAt && Date.now() - new Date(userCreatedAt).getTime() < 1000 * 60 * 60 * 24 * 14)
    const isRecent = pending ? Date.now() - pending.createdAt < 1000 * 60 * 60 * 24 * 14 : false
    if (matchesUser && isRecent) {
      window.localStorage.removeItem(PENDING_KEY)
      return true
    }
  } catch {
    window.localStorage.removeItem(PENDING_KEY)
  }

  return false
}

export function hasPendingOnboarding(userEmail: string | null | undefined, userCreatedAt?: string | null) {
  if (!canUseStorage() || !userEmail) return false

  try {
    const pending = JSON.parse(window.localStorage.getItem(PENDING_KEY) ?? 'null') as PendingOnboarding | null
    const matchesUser = pending?.email
      ? pending.email === userEmail.trim().toLowerCase()
      : Boolean(userCreatedAt && Date.now() - new Date(userCreatedAt).getTime() < 1000 * 60 * 60 * 24 * 14)
    const isRecent = pending ? Date.now() - pending.createdAt < 1000 * 60 * 60 * 24 * 14 : false
    return Boolean(matchesUser && isRecent)
  } catch {
    return false
  }
}

export function onboardingHasBeenCompleted(userId: string) {
  if (!canUseStorage()) return false
  return window.localStorage.getItem(`${COMPLETED_KEY_PREFIX}${userId}`) === 'true'
}

export function completeOnboarding(userId: string) {
  if (!canUseStorage()) return
  window.localStorage.setItem(`${COMPLETED_KEY_PREFIX}${userId}`, 'true')
}

function surfaceCompletionKey(userId: string, surface: OnboardingSurface) {
  return `${SURFACE_COMPLETED_KEY_PREFIX}${surface}:v1:${userId}`
}

export function surfaceOnboardingHasBeenCompleted(userId: string, surface: OnboardingSurface) {
  if (!canUseStorage()) return false

  // Preserve the previous Studio completion state so existing users are not reintroduced unexpectedly.
  if (surface === 'studio' && onboardingHasBeenCompleted(userId)) return true

  return window.localStorage.getItem(surfaceCompletionKey(userId, surface)) === 'true'
}

export function completeSurfaceOnboarding(userId: string, surface: OnboardingSurface) {
  if (!canUseStorage()) return
  window.localStorage.setItem(surfaceCompletionKey(userId, surface), 'true')
}
