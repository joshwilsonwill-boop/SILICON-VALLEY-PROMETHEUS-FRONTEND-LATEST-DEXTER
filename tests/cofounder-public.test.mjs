import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'
import ts from 'typescript'

const read = (path) => fs.readFileSync(path, 'utf8')
const load = async (path) => import(`data:text/javascript;base64,${Buffer.from(ts.transpileModule(read(path), { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText).toString('base64')}`)
const cookies = await load('lib/cookies/cookie-config.ts')
const routes = await load('lib/footer-routes.ts')

test('clean and malformed sessions require a choice with every optional category off', () => {
  assert.equal(cookies.parseCookieConsent(null), null)
  for (const value of ['null', '[]', '{}', 'broken', JSON.stringify({ version: '1.0', timestamp: '', analytics: true }), JSON.stringify({ ...cookies.createConsent({ analytics: true }), timestamp: 'bad' }), JSON.stringify({ ...cookies.createConsent({ analytics: true }), marketing: 'yes' })]) {
    assert.equal(cookies.parseCookieConsent(value), null)
  }
  assert.deepEqual([cookies.ESSENTIAL_ONLY_CONSENT.analytics, cookies.ESSENTIAL_ONLY_CONSENT.preferences, cookies.ESSENTIAL_ONLY_CONSENT.marketing], [false, false, false])
})

test('reject survives a reload; explicit consent grants only selected categories', () => {
  const rejected = cookies.parseCookieConsent(JSON.stringify(cookies.createConsent({})))
  assert.equal(rejected.essential, true)
  assert.equal(rejected.analytics, false)
  const accepted = cookies.parseCookieConsent(JSON.stringify(cookies.createConsent({ analytics: true })))
  assert.equal(accepted.analytics, true)
  assert.equal(accepted.marketing, false)
  assert.equal(cookies.parseCookieConsent(JSON.stringify({ ...accepted, version: '0.9' })), null)
})

test('unavailable browser storage defaults safely', () => {
  globalThis.window = { localStorage: { getItem() { throw new Error('blocked') } } }
  try { assert.equal(cookies.hasPreferenceConsent(), false) } finally { delete globalThis.window }
})

test('public and auth routes share footer while workspace routes do not', () => {
  for (const route of ['/', '/pricing', '/login/', '/forgot-password', '/docs', '/contact', '/signup']) assert.equal(routes.shouldShowGlobalFooter(route), true, route)
  for (const route of ['/editor/123', '/projects', '/assets', '/settings/profile', '/analytics']) assert.equal(routes.shouldShowGlobalFooter(route), false, route)
})

test('public trust, indexing and recovery surfaces exist', () => {
  assert.doesNotMatch(read('app/privacy/page.tsx'), /\[TBD\]/)
  assert.doesNotMatch(read('app/contact/page.tsx'), /Official Registered Business Address|WHATSAPP_BUSINESS_PHONE/)
  assert.doesNotMatch(read('app/docs/page.tsx'), /href: '\/(projects|assets)'/)
  assert.match(read('app/not-found.tsx'), /href="\/pricing"/)
  assert.match(read('app/studio/page.tsx'), /permanentRedirect/)
  assert.match(read('app/layout.tsx'), /summary_large_image/)
  assert.match(read('app/opengraph-image.tsx'), /width: 1200, height: 630/)
  assert.match(read('app/robots.ts'), /sitemap/)
  assert.match(read('app/sitemap.ts'), /\/pricing/)
})

test('three fonts and common focus treatment preserve CSP nonce rendering', () => {
  const layout = read('app/layout.tsx')
  assert.doesNotMatch(layout, /localFont|Space_Grotesk|Geist/)
  assert.match(layout, /await headers\(\)/)
  assert.match(read('app/globals.css'), /:focus-visible/)
  assert.match(read('components/brand-wordmark.tsx'), /Prometheus Studio/)
})

test.after(() => console.log('COFOUNDER_PUBLIC_TESTS_PASSED'))
