import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const root = process.cwd()

function read(relativePath) {
  return readFileSync(join(root, relativePath), 'utf8')
}

function run() {
  const onboarding = read('components/onboarding/cinematic-onboarding.tsx')
  const storage = read('lib/onboarding.ts')
  const help = read('components/global-help-launcher.tsx')
  const signup = read('components/auth/SignupForm.tsx')
  const socialSignup = read('components/auth/SocialAuthButtons.tsx')
  const rootEffects = read('components/root-client-effects.tsx')

  assert.match(onboarding, /CinematicOnboarding/)
  assert.match(onboarding, /EditorialOnboardingReplay/)
  assert.match(onboarding, /Skip/)
  assert.match(onboarding, /prefers-reduced-motion|useReducedMotion/)
  assert.match(onboarding, /aria-modal="true"/)
  assert.match(onboarding, /Enter studio/)
  assert.match(onboarding, /Enter chamber/)
  assert.match(storage, /ONBOARDING_OPEN_EVENT/)
  assert.match(storage, /completeOnboarding/)
  assert.match(help, /Onboarding/)
  assert.match(help, /openCinematicOnboarding/)
  assert.match(signup, /markOnboardingPending\(email\)/)
  assert.match(socialSignup, /window\.location\.pathname === '\/signup'/)
  assert.match(socialSignup, /markOnboardingPending\(\)/)
  assert.match(rootEffects, /<CinematicOnboarding/)
}

run()
