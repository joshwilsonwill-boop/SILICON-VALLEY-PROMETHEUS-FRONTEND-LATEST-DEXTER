import { readFileSync } from 'node:fs'

const proxy = readFileSync('proxy.ts', 'utf8')
const security = readFileSync('lib/server/request-security.ts', 'utf8')
const layout = readFileSync('app/layout.tsx', 'utf8')

if (!proxy.includes('const cspHeader = createContentSecurityPolicy(nonce)')) {
  throw new Error('Proxy does not create one CSP header for the request and response')
}
if (!proxy.includes("requestHeaders.set('Content-Security-Policy', cspHeader)")) {
  throw new Error('Proxy does not pass CSP to Next request rendering')
}
if (!security.includes('export function createContentSecurityPolicy')) {
  throw new Error('CSP policy builder is not reusable at the request boundary')
}
if (!security.includes("script-src 'self' 'nonce-")) {
  throw new Error('CSP script nonce directive is missing')
}
if (!layout.includes('await headers()')) {
  throw new Error('Root layout is statically prerendered without a per-request nonce')
}

console.log('CSP HYDRATION PASS')
