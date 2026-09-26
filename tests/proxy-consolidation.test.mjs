import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'

assert.equal(existsSync('middleware.ts'), false, 'Next must have only one request proxy entry point')
assert.equal(existsSync('proxy.ts'), true)

const proxy = readFileSync('proxy.ts', 'utf8')
const security = readFileSync('lib/server/request-security.ts', 'utf8')

assert.match(proxy, /enforceRateLimit\(request\)/)
assert.match(proxy, /requestHeaders\.set\('x-nonce', nonce\)/)
assert.match(proxy, /applySecurityHeaders\(response, nonce\)/)
assert.match(proxy, /supabase\.auth\.getUser\(\)/)
assert.match(proxy, /redirectToSignup\(request\)/)
assert.match(security, /Ratelimit\.slidingWindow\(120, '60 s'\)/)
assert.match(security, /Content-Security-Policy/)
assert.match(security, /process\.env\.NODE_ENV === 'development' \? " 'unsafe-eval'" : ''/)
assert.match(security, /X-Frame-Options/)
assert.match(security, /X-Content-Type-Options/)

console.log('proxy consolidation checks passed')
