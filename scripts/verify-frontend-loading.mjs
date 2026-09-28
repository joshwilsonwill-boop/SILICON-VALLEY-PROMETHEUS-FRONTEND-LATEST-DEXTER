import { readFileSync } from 'node:fs'

const entry = readFileSync('app/editor/page.tsx', 'utf8')
const detail = readFileSync('app/editor/[id]/page.tsx', 'utf8')
const helper = readFileSync('lib/fetch-with-timeout.ts', 'utf8')

if (!entry.includes("from '@/lib/fetch-with-timeout'") || !entry.includes('fetchWithTimeout(')) {
  throw new Error('Editor entry route does not use bounded bootstrap requests')
}
if (!detail.includes("from '@/lib/fetch-with-timeout'") || !detail.includes('fetchWithTimeout(')) {
  throw new Error('Editor project route does not use bounded bootstrap requests')
}
if (!helper.includes('controller.abort()') || !helper.includes('clearTimeout(timeoutId)')) {
  throw new Error('Fetch timeout helper is incomplete')
}

console.log('FRONTEND ROUTES PASS')
