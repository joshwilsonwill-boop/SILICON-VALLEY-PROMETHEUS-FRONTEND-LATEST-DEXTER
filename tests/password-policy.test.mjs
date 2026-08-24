import test from 'node:test'
import assert from 'node:assert/strict'

test('password policy matches the Supabase weak-password requirements', async () => {
  const { getPasswordPolicyError, PASSWORD_POLICY_HINT } = await import('../lib/auth/password.ts')

  assert.equal(getPasswordPolicyError(''), 'Password must be at least 8 characters.')
  assert.equal(getPasswordPolicyError('short'), 'Password must be at least 8 characters.')
  assert.equal(getPasswordPolicyError('lowercaseonly1!'), PASSWORD_POLICY_HINT)
  assert.equal(getPasswordPolicyError('NoNumbersOnly!'), PASSWORD_POLICY_HINT)
  assert.equal(getPasswordPolicyError('UPPERCASE123!'), PASSWORD_POLICY_HINT)
  assert.equal(getPasswordPolicyError('NoSpecial12345'), PASSWORD_POLICY_HINT)
  assert.equal(getPasswordPolicyError('C0rrect-Horse-Battery-Staple!'), null)
})
