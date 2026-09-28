import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const security = readFileSync('lib/server/request-security.ts', 'utf8')
const proxy = readFileSync('proxy.ts', 'utf8')
const layout = readFileSync('app/layout.tsx', 'utf8')

assert.match(security, /script-src 'self'/)
assert.match(security, /'nonce-\$\{nonce\}'/)
assert.doesNotMatch(security, /'strict-dynamic'/, 'CSP must not require nonces that Next does not attach to static scripts')
assert.match(proxy, /requestHeaders\.set\('Content-Security-Policy', cspHeader\)/)
assert.match(layout, /await headers\(\)/)
console.log('csp hydration check passed')
