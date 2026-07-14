import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const root = process.cwd()
const read = (relativePath) => readFileSync(join(root, relativePath), 'utf8')

const backButton = read('components/navigation/BackButton.tsx')
const pageHeader = read('components/page-header.tsx')
const projects = read('components/projects/projects-page-v2.tsx')

assert.match(backButton, /fallbackHref\?: string/, 'BackButton must support a logical fallback route.')
assert.equal(backButton.includes('router.back()'), false, 'Page-level back actions must not rely on browser history.')
assert.match(backButton, /router\.push\(fallbackHref\)/, 'BackButton must always use its logical fallback route.')
assert.match(pageHeader, /backHref\?: string/, 'PageHeader must allow callers to define a logical back destination.')
assert.match(pageHeader, /<BackButton fallbackHref=\{backHref\}/, 'PageHeader must pass its fallback destination to BackButton.')
assert.match(projects, /import \{ BackButton \} from '@\/components\/navigation\/BackButton'/, 'Projects must import the shared BackButton.')
assert.match(projects, /<BackButton[\s\S]*fallbackHref="\/studio"/, 'Projects must expose a Studio fallback in its visible header.')

for (const page of [
  'app/brand-kit/page.tsx',
  'app/broll/page.tsx',
  'app/captions/page.tsx',
  'app/highlights/page.tsx',
  'app/templates/page.tsx',
  'app/team/page.tsx',
  'app/settings/billing/success/page.tsx',
]) {
  assert.match(read(page), /showBackButton/, `${page} must opt its PageHeader into the shared back action.`)
}

assert.match(
  read('app/settings/social-accounts/page.tsx'),
  /<PageHeader[\s\S]*showBackButton/,
  'Connected Accounts must use the shared, header-aligned back action.',
)
assert.match(
  read('components/analytics/PrometheusAnalytics.tsx'),
  /<BackButton fallbackHref="\/studio"/,
  'Analytics must offer a Studio fallback in its header.',
)

console.log('back navigation regression checks passed')
