import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const root = process.cwd()

function read(relativePath) {
  return readFileSync(join(root, relativePath), 'utf8')
}

function run() {
  const onboarding = read('components/onboarding/studio-onboarding.tsx')
  const storage = read('lib/onboarding.ts')
  const help = read('components/global-help-launcher.tsx')
  const signup = read('components/auth/SignupForm.tsx')
  const socialSignup = read('components/auth/SocialAuthButtons.tsx')
  const rootEffects = read('components/root-client-effects.tsx')

  assert.match(onboarding, /StudioOnboarding/)
  assert.match(onboarding, /Skip for now/)
  assert.match(onboarding, /prefers-reduced-motion|useReducedMotion/)
  assert.match(onboarding, /aria-modal="true"/)
  assert.match(onboarding, /split\(''\)/)
  assert.match(onboarding, /Enter the studio/)
  assert.match(storage, /ONBOARDING_OPEN_EVENT/)
  assert.match(storage, /completeOnboarding/)
  assert.match(help, /Studio introduction/)
  assert.match(help, /openStudioOnboarding/)
  assert.match(signup, /markOnboardingPending\(email\)/)
  assert.match(socialSignup, /window\.location\.pathname === '\/signup'/)
  assert.match(socialSignup, /markOnboardingPending\(\)/)
  assert.match(rootEffects, /<StudioOnboarding/)
}

run()
