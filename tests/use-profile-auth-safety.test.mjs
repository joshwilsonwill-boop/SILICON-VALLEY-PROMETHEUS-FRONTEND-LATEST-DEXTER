import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const hook = readFileSync(join(process.cwd(), 'hooks/use-profile.ts'), 'utf8')

assert.match(
  hook,
  /async function fetchProfile\(profileUser: NonNullable<typeof session>\['user'\]\)/,
  'The async profile fetch must accept an authenticated user explicitly.',
)
assert.match(hook, /\.eq\('id', profileUser\.id\)/)
assert.match(hook, /data \?\? \{ id: profileUser\.id, email: profileUser\.email \?\? null \}/)
assert.match(hook, /void fetchProfile\(user\)/)

console.log('use-profile-auth-safety: all checks passed.')
