import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const source = readFileSync('lib/fetch-with-timeout.ts', 'utf8')
assert.match(source, /export async function fetchWithTimeout/)
assert.ok(source.includes('controller.abort()'))
assert.ok(source.includes('init.signal ?? controller.signal'))
assert.ok(source.includes('clearTimeout(timeoutId)'))
assert.ok(source.includes('Promise.race'))
console.log('fetch timeout check passed')
