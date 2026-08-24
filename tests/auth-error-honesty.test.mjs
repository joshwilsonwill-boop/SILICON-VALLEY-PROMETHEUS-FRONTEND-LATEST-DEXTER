import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const root = process.cwd()
const read = (relativePath) => readFileSync(join(root, relativePath), 'utf8')

const DB_HONEST =
  'Prometheus hit a database problem while finishing that step. This is on our side — nothing is wrong with your connection. Please try again in a moment.'
const CONNECTION_DROPPED_PREFIX = 'The connection dropped'
const EMAIL_TAKEN_PREFIX = 'That email is already attached'

test('normalizeUxError reports RLS rejections as a database problem, not a dropped connection', async (t) => {
  const { normalizeUxError } = await import('../lib/ux/errors.ts')

  await t.test('row-level security violation on profiles insert', () => {
    const raw = 'new row violates row-level security policy for table "profiles"'
    const message = normalizeUxError(new Error(raw), 'signup')
    assert.equal(message, DB_HONEST)
    assert.ok(!message.startsWith(CONNECTION_DROPPED_PREFIX))
  })

  await t.test('GoTrue trigger failure surfaces as a database problem', () => {
    const message = normalizeUxError(new Error('Database error saving new user'), 'signup')
    assert.equal(message, DB_HONEST)
  })

  await t.test('unique-constraint violation is not mislabeled as a duplicate email', () => {
    const raw = 'duplicate key value violates unique constraint "profiles_pkey"'
    const message = normalizeUxError(new Error(raw), 'signup')
    assert.equal(message, DB_HONEST)
    assert.ok(!message.startsWith(EMAIL_TAKEN_PREFIX))
  })

  await t.test('missing profiles relation', () => {
    const message = normalizeUxError(new Error('relation "public.profiles" does not exist'), 'signup')
    assert.equal(message, DB_HONEST)
  })

  await t.test('Postgres error codes classify as database problems', () => {
    assert.equal(normalizeUxError(new Error('Error 42501: denied'), 'signup'), DB_HONEST)
  })

  await t.test('a message merely containing "connection" is no longer repainted as a user network problem', () => {
    const message = normalizeUxError(new Error('Unexpected connection state while saving the account'), 'signup')
    assert.ok(!message.startsWith(CONNECTION_DROPPED_PREFIX), `got: ${message}`)
  })

  await t.test('genuine transport failures keep the network message', () => {
    for (const raw of ['Failed to fetch', 'fetch failed', 'TypeError: NetworkError when attempting to fetch resource.']) {
      const message = normalizeUxError(new Error(raw), 'signup')
      assert.ok(message.startsWith(CONNECTION_DROPPED_PREFIX), `${raw} -> ${message}`)
    }
  })

  await t.test('existing-email errors keep the sign-in guidance', () => {
    const message = normalizeUxError(new Error('User already registered'), 'signup')
    assert.ok(message.startsWith(EMAIL_TAKEN_PREFIX))
  })

  await t.test('weak-password rejections get the password policy hint, not the generic fallback', () => {
    const raw = 'Password should contain at least one character of each: abcdefghijklmnopqrstuvwxyz, ABCDEFGHIJKLMNOPQRSTUVWXYZ, 0123456789, !@#$%^&*()_+-=[]{};\':"|<>?,./`~.'
    const message = normalizeUxError(new Error(raw), 'signup')
    assert.equal(
      message,
      'Choose a stronger password with an uppercase letter, a lowercase letter, a number, and a special character.',
    )
    assert.ok(!message.includes('could not create the account'))
  })

  await t.test('weak_password pass-through stays stable on double normalization', () => {
    const once = normalizeUxError(new Error('Password should contain at least one character of each'), 'signup')
    const twice = normalizeUxError(once, 'signup')
    assert.equal(twice, once)
  })

  await t.test('non-database "does not exist" errors are not claimed as database faults', () => {
    const message = normalizeUxError(new Error('File does not exist'), 'upload')
    assert.notEqual(message, DB_HONEST)
  })

  await t.test('already-normalized messages pass through unchanged (server -> client double normalization)', () => {
    for (const raw of [
      'new row violates row-level security policy for table "profiles"',
      'User already registered',
      'Failed to fetch',
      'Database error saving new user',
    ]) {
      const once = normalizeUxError(new Error(raw), 'signup')
      const twice = normalizeUxError(once, 'signup')
      assert.equal(twice, once)
    }
  })
})

test('auth routes keep the real error cause in server logs', () => {
  const signup = read('app/api/auth/signup/route.ts')
  assert.match(signup, /rawMessage/, 'signup route must log the raw error message')
  assert.match(signup, /rawName/, 'signup route must log the raw error name')

  const login = read('app/api/auth/login/route.ts')
  assert.match(login, /rawMessage/, 'login route must log the raw error message')
})

test('new users get a profile row created with their own session', () => {
  const confirm = read('app/auth/confirm/route.ts')
  assert.match(confirm, /ensureProfile\(supabase\)/, 'email confirmation must bootstrap the profile row')

  const signup = read('app/api/auth/signup/route.ts')
  assert.match(signup, /ensureProfile\(supabase\)/, 'immediate-session signup must bootstrap the profile row')

  const profile = read('lib/supabase/profile.ts')
  assert.match(profile, /\[profile-bootstrap\] insert rejected/, 'rejected inserts must be logged under a greppable tag')
  assert.match(profile, /code: createError\.code/, 'logged rejection must include the Postgres error code')
})

test('signup form trusts the server-provided error verbatim', () => {
  const form = read('components/auth/SignupForm.tsx')
  assert.match(form, /ServerSignupError/, 'form must distinguish server messages from transport failures')
  assert.match(form, /err instanceof ServerSignupError \&\& err\.message\.trim\(\)/)
})
