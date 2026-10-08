import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { runInNewContext } from 'node:vm'

const require = createRequire(import.meta.url)
const ts = require('typescript')
const compiled = ts.transpileModule(readFileSync('lib/server/request-security.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText

function limiter({ configured = true, unavailable = false } = {}) {
  const counts = new Map()
  const configuration = []
  class Ratelimit {
    static slidingWindow(count, window) { return { count, window } }
    constructor(options) { configuration.push(options) }
    async limit(key) {
      if (unavailable) throw new Error('Redis unavailable')
      const count = (counts.get(key) ?? 0) + 1
      counts.set(key, count)
      return { success: count <= 120 }
    }
  }
  const compiledModule = { exports: {} }
  runInNewContext(compiled, {
    module: compiledModule, exports: compiledModule.exports,
    process: { env: configured ? { UPSTASH_REDIS_REST_URL: 'test', UPSTASH_REDIS_REST_TOKEN: 'test' } : {} },
    require: name => {
      if (name === 'next/server') return { NextResponse: { json: (body, options) => ({ body, ...options }) } }
      if (name === '@upstash/ratelimit') return { Ratelimit }
      if (name === '@upstash/redis') return { Redis: { fromEnv: () => ({}) } }
      throw new Error(`Unexpected module: ${name}`)
    },
  })
  return { enforce: compiledModule.exports.enforceRateLimit, counts, configuration }
}
function request(path, ip = '203.0.113.1', extraHeaders = {}) {
  return { nextUrl: new URL(path, 'https://example.test'), headers: new Headers({ 'x-forwarded-for': ip, ...extraHeaders }) }
}

// A refresh fans out into navigation, fonts, logo video ranges and API reads.
// Only API requests should consume the API budget, regardless of request headers.
const refresh = limiter()
for (let round = 0; round < 4; round++) {
  for (const path of ['/', '/projects', '/editor/sample?tab=Motion', '/settings/appearance', '/apiary', '/branding/logo.webm', '/fonts/brand.ttf', '/_next/static/chunk.js']) {
    for (let i = 0; i < 8; i++) assert.equal(await refresh.enforce(request(path)), null, `${path}: normal refresh must remain available`)
    assert.equal(await refresh.enforce(request(path, undefined, { rsc: '1', 'next-router-prefetch': '1' })), null)
  }
  for (let i = 0; i < 20; i++) assert.equal(await refresh.enforce(request('/api/projects')), null)
}
assert.equal([...refresh.counts.values()].reduce((a, b) => a + b, 0), 80, 'Navigation and media cannot spend API tokens')
assert.equal(refresh.configuration[0].limiter.count, 120)
assert.equal(refresh.configuration[0].limiter.window, '60 s')

// Positive control: the fix must not disable API abuse protection or allow
// clients to bypass it by pretending to be a navigation/prefetch request.
const api = limiter()
for (let i = 0; i < 120; i++) assert.equal(await api.enforce(request('/api/projects')), null)
const rejection = await api.enforce(request('/api/projects', undefined, { accept: 'text/html', rsc: '1', 'next-router-prefetch': '1' }))
assert.equal(rejection.status, 429)
assert.equal(rejection.body.code, 'RATE_LIMITED')
assert.equal(rejection.headers['Retry-After'], '60')
assert.equal(await api.enforce(request('/projects')), null, 'An exhausted API bucket cannot replace a page with JSON')
assert.equal(await api.enforce(request('/api/projects', '203.0.113.2, 10.0.0.1')), null, 'Different clients have independent budgets')
assert.equal(await limiter({ configured: false }).enforce(request('/api/projects')), null)
assert.equal(await limiter({ unavailable: true }).enforce(request('/api/projects')), null)
console.log('request rate limit checks passed')
