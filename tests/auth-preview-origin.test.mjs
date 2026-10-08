import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { runInNewContext } from 'node:vm'

const require = createRequire(import.meta.url)
const ts = require('typescript')
const source = readFileSync('lib/auth/redirect.ts', 'utf8')
const compiled = ts.transpileModule(source, {
  fileName: 'lib/auth/redirect.ts',
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText

const production = 'https://prometheusstudio.tech'
const deployment = 'https://studio-preview-a1b2.vercel.app'
const branch = 'https://studio-git-settings-owner.vercel.app'
const previewEnv = {
  NEXT_PUBLIC_SITE_URL: production,
  NEXT_PUBLIC_AUTH_PREVIEW_ORIGINS: JSON.stringify([deployment, branch]),
}

function load(env, browserOrigin) {
  const vmModule = { exports: {} }
  runInNewContext(compiled, {
    module: vmModule,
    exports: vmModule.exports,
    process: { env },
    URL,
    Request,
    ...(browserOrigin ? { window: { location: { origin: browserOrigin } } } : {}),
  })
  return vmModule.exports
}

for (const origin of [deployment, branch]) {
  const browser = load(previewEnv, origin)
  assert.equal(browser.getSiteOrigin(), origin, 'OAuth must return to the preview that started sign-in, not the old production interface')
  const server = load(previewEnv)
  for (const input of [new Request(`${origin}/auth/confirm`), new URL(`${origin}/auth/confirm`), `${origin}/auth/confirm`]) {
    assert.equal(server.getSiteOrigin(input), origin, 'The server callback must retain the preview host and its session cookie')
    const confirm = server.buildAuthConfirmUrl(input, '/settings?panel=appearance')
    assert.equal(confirm.origin, origin)
    assert.equal(confirm.pathname, '/auth/confirm')
    assert.equal(confirm.searchParams.get('next'), '/settings?panel=appearance')
  }
}

for (const candidate of ['https://attacker.test', 'https://unrelated.vercel.app', 'https://studio-preview-a1b2.vercel.app.attacker.test', 'http://studio-preview-a1b2.vercel.app']) {
  assert.equal(load(previewEnv, candidate).getSiteOrigin(), production, 'Unregistered hosts must not become auth destinations')
  assert.equal(load(previewEnv).getSiteOrigin(`${candidate}/auth/confirm`), production)
}

for (const malformed of ['', 'not-json', '{}', 'null']) {
  assert.equal(load({ NEXT_PUBLIC_SITE_URL: production, NEXT_PUBLIC_AUTH_PREVIEW_ORIGINS: malformed }, branch).getSiteOrigin(), production)
}

// Configured production behavior stays canonical, even when requested via an alias.
assert.equal(load({ NEXT_PUBLIC_SITE_URL: production }, branch).getSiteOrigin(), production)
assert.equal(load({ NEXT_PUBLIC_SITE_URL: production }, production).getSiteOrigin(), production)
assert.equal(load({}).getSiteOrigin(new Request('http://localhost:3000/auth/confirm')), 'http://localhost:3000')
assert.equal(load({}, 'http://localhost:3000').getSiteOrigin(), 'http://localhost:3000')

const redirects = load(previewEnv)
for (const unsafe of ['https://attacker.test', '//attacker.test/settings', '/\\attacker.test/settings', 'javascript:alert(1)']) {
  assert.equal(redirects.normalizeNextPath(unsafe), '/')
}
assert.equal(redirects.normalizeNextPath('/settings?panel=workspace#team'), '/settings?panel=workspace#team')

// Exercise the real Next build config: only the current platform-owned preview
// hostnames are exposed to both bundles, with no broad vercel.app wildcard.
const originalEnv = { ...process.env }
try {
  Object.assign(process.env, {
    VERCEL_ENV: 'preview',
    VERCEL_URL: new URL(deployment).host,
    VERCEL_BRANCH_URL: new URL(branch).host,
  })
  const previewConfig = (await import('../next.config.mjs?auth-preview-test')).default
  assert.deepEqual(JSON.parse(previewConfig.env.NEXT_PUBLIC_AUTH_PREVIEW_ORIGINS), [deployment, branch])
  process.env.VERCEL_ENV = 'production'
  const productionConfig = (await import('../next.config.mjs?auth-production-test')).default
  assert.deepEqual(JSON.parse(productionConfig.env.NEXT_PUBLIC_AUTH_PREVIEW_ORIGINS), [])
  Object.assign(process.env, { VERCEL_ENV: 'preview', VERCEL_URL: 'attacker.test', VERCEL_BRANCH_URL: 'attacker@studio.vercel.app' })
  const invalidConfig = (await import('../next.config.mjs?auth-invalid-host-test')).default
  assert.deepEqual(JSON.parse(invalidConfig.env.NEXT_PUBLIC_AUTH_PREVIEW_ORIGINS), [])
} finally {
  for (const key of Object.keys(process.env)) if (!(key in originalEnv)) delete process.env[key]
  Object.assign(process.env, originalEnv)
}

console.log('preview auth origin checks passed')
