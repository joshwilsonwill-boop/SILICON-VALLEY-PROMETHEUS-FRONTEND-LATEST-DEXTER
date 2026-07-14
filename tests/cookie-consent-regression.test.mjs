import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const root = process.cwd()
const read = (relativePath) => readFileSync(join(root, relativePath), 'utf8')
const requiredFiles = [
  'COOKIE_POLICY.md',
  'components/cookie-consent/banner.tsx',
  'components/cookie-consent/preferences-panel.tsx',
  'components/cookie-consent/consent-context.tsx',
  'hooks/use-cookie-consent.ts',
  'lib/cookies/cookie-config.ts',
  'app/cookie-policy/page.tsx',
]

for (const relativePath of requiredFiles) {
  assert.ok(existsSync(join(root, relativePath)), `${relativePath} must exist.`)
}

const policy = read('COOKIE_POLICY.md')
const config = read('lib/cookies/cookie-config.ts')
const context = read('components/cookie-consent/consent-context.tsx')
const banner = read('components/cookie-consent/banner.tsx')
const preferencesPanel = read('components/cookie-consent/preferences-panel.tsx')
const layout = read('app/layout.tsx')
const footer = read('components/Footer.tsx')
const privacy = read('app/privacy/page.tsx')

assert.match(policy, /\*\*Last Updated:\*\*/, 'Cookie Policy must expose a Last Updated field.')
assert.match(policy, /Essential Cookies.*Always Active/s, 'Cookie Policy must document essential cookies.')
assert.match(policy, /Analytics Cookies.*Consent/s, 'Cookie Policy must document consent-gated analytics.')
assert.match(policy, /Marketing Cookies.*Explicit Opt-In/s, 'Cookie Policy must document marketing consent.')
assert.match(policy, /prometheus_cookie_consent/, 'Cookie Policy must name the consent storage key.')
assert.match(config, /prometheus_cookie_consent/, 'Cookie config must use the required storage key.')
assert.match(config, /analytics: false/, 'Consent must default analytics to off.')
assert.match(config, /preferences: false/, 'Consent must default preferences to off.')
assert.match(config, /marketing: false/, 'Consent must default marketing to off.')
assert.match(context, /localStorage/, 'Consent must persist in localStorage.')
assert.match(banner, /Accept All/, 'Banner must offer Accept All.')
assert.match(banner, /Reject Non-Essential/, 'Banner must offer an equally explicit reject action.')
assert.match(banner, /Customize/, 'Banner must offer granular preferences.')
assert.match(preferencesPanel, /Essential/, 'Preferences panel must show essential cookies.')
assert.match(preferencesPanel, /disabled/, 'Essential toggle must be disabled.')
assert.match(preferencesPanel, /Save Preferences/, 'Preferences panel must save granular choices.')
assert.match(layout, /CookieConsentProvider/, 'Root layout must mount the consent provider.')
assert.match(layout, /ConsentGatedAnalytics/, 'Root layout must gate analytics by consent.')
assert.doesNotMatch(layout, /<Analytics\s*\/>/, 'Vercel Analytics must not mount unconditionally.')
assert.match(footer, /Cookie Policy/, 'Footer must link the Cookie Policy.')
assert.match(footer, /Cookie Settings/, 'Footer must expose Cookie Settings.')
assert.match(footer, /Do Not Sell or Share My Personal Information/, 'Footer must expose the CCPA request link.')
assert.match(privacy, /Cookie Policy/, 'Privacy Policy must cross-reference the Cookie Policy.')

console.log('cookie consent regression checks passed')
