import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const root = process.cwd()
const read = (relativePath) => readFileSync(join(root, relativePath), 'utf8')

test('Mini-Run GPU Proxy Route Hardening (SEC-GW-02)', async (t) => {
  const source = read('app/api/mini-run/[...path]/route.ts')

  await t.test('imports createClient from Supabase server helper', () => {
    assert.match(
      source,
      /import\s*\{\s*createClient\s*\}\s*from\s*['"]@\/lib\/supabase\/server['"]/,
      'Must import createClient to verify user sessions'
    )
  })

  await t.test('enforces supabase.auth.getUser() on GPU pipeline endpoints', () => {
    assert.match(
      source,
      /await\s+supabase\.auth\.getUser\(\)/,
      'Must call supabase.auth.getUser() to authenticate request'
    )
    assert.match(
      source,
      /return\s+NextResponse\.json\(\s*\{\s*error:\s*['"]Unauthorized['"]\s*\}\s*,\s*\{\s*status:\s*401\s*\}\s*\)/,
      'Must return 401 Unauthorized when unauthenticated'
    )
  })

  await t.test('exempts GET health check from authentication for liveness probes', () => {
    assert.match(
      source,
      /isHealthCheck\s*=\s*request\.method\.toUpperCase\(\)\s*===\s*['"]GET['"]\s*&&\s*joinedPath\s*===\s*['"]health['"]/,
      'Health check endpoint must be allowed unauthenticated for probes'
    )
    assert.match(
      source,
      /if\s*\(!isHealthCheck\)\s*\{/,
      'Authentication check must wrap all non-health routes'
    )
  })
})

test('Hermes Agent Route IDOR Protection (SEC-GW-03)', async (t) => {
  const source = read('app/api/hermes/agent/route.ts')

  await t.test('sessionUserId strictly overrides caller-supplied body.userId', () => {
    assert.match(
      source,
      /sessionUserId\s*\|\|\s*\(/,
      'Verified sessionUserId must take precedence over body.userId to prevent IDOR'
    )
    assert.match(
      source,
      /const\s+isAuthenticated\s*=\s*Boolean\(sessionUserId\)/,
      'Must determine authentication state strictly based on sessionUserId'
    )
  })

  await t.test('getDriveToken is strictly bound to authenticated session user', () => {
    assert.match(
      source,
      /const\s+getDriveToken\s*=\s*\(supabase\s*&&\s*isAuthenticated\s*&&\s*sessionUserId\)\s*\?\s*\(\)\s*=>\s*getValidAccessToken\(sessionUserId,\s*['"]google_drive['"]\)\s*:\s*undefined/,
      'getDriveToken must be undefined unless caller is authenticated session user'
    )
    assert.doesNotMatch(
      source,
      /getValidAccessToken\(userId,\s*['"]google_drive['"]\)/,
      'getValidAccessToken must never be called with an unverified caller-supplied userId'
    )
  })

  await t.test('memoryStore uses InMemory fallback for unauthenticated callers', () => {
    assert.match(
      source,
      /const\s+memoryStore\s*=\s*\(supabase\s*&&\s*isAuthenticated\)\s*\?\s*new\s+SupabaseHermesMemoryStore\(supabase\)\s*:\s*new\s+InMemoryHermesMemoryStore\(\)/,
      'SupabaseHermesMemoryStore must only be used for authenticated sessions'
    )
  })
})

test('Voice Companion Session Key Protection (SEC-GW-01)', async (t) => {
  const source = read('app/api/voice-companion/session/route.ts')

  await t.test('imports createClient from Supabase server helper', () => {
    assert.match(
      source,
      /import\s*\{\s*createClient\s*\}\s*from\s*['"]@\/lib\/supabase\/server['"]/,
      'Must import createClient to verify caller session before dispensing API keys'
    )
  })

  await t.test('enforces session authentication and returns 401 Unauthorized for anonymous requests', () => {
    assert.match(
      source,
      /await\s+supabase\.auth\.getUser\(\)/,
      'Must verify caller identity via getUser()'
    )
    assert.match(
      source,
      /status:\s*401/,
      'Must return 401 status when session is missing or invalid'
    )
    assert.match(
      source,
      /detail:\s*['"]Authentication required for voice companion session\.['"]/,
      'Must provide clear authentication error detail'
    )
  })

  await t.test('preserves required Gemini Live model and BidiGenerateContent contract fields', () => {
    assert.match(source, /models\/gemini-3\.1-flash-live-preview/)
    assert.match(source, /models\/gemini-2\.5-flash-native-audio-preview-12-2025/)
    assert.match(source, /candidateModels/)
    assert.match(source, /BidiGenerateContent/)
  })
})
