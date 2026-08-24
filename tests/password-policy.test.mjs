import test from 'node:test'
import assert from 'node:assert/strict'

test('password policy flags exactly what is missing', async () => {
  const { getPasswordPolicyError } = await import('../lib/auth/password.ts')

  assert.equal(getPasswordPolicyError(''), 'Use at least 8 characters for your password.')
  assert.equal(getPasswordPolicyError('short'), 'Use at least 8 characters for your password.')

  assert.equal(getPasswordPolicyError('lowercaseonly1!'), 'Add an uppercase letter to your password.')
  assert.equal(getPasswordPolicyError('NoNumbersOnly!'), 'Add a number to your password.')
  assert.equal(getPasswordPolicyError('UPPERCASE123!'), 'Add a lowercase letter to your password.')
  assert.equal(getPasswordPolicyError('NoSpecial12345'), 'Add a special character (e.g. !@#$%) to your password.')

  assert.equal(getPasswordPolicyError('nomajusculesymbol!'), 'Password still needs an uppercase letter and a number.')
  assert.equal(
    getPasswordPolicyError('alllowercasedigits1234'),
    'Password still needs an uppercase letter and a special character (e.g. !@#$%).',
  )

  assert.equal(getPasswordPolicyError('C0rrect-Horse-Battery-Staple!'), null)
})

test('normalizeUxError maps rate-limit rejections to a clear message', async () => {
  const { normalizeUxError } = await import('../lib/ux/errors.ts')

  for (const raw of [
    'over_email_send_rate_limit',
    'email rate limit exceeded',
    'over_request_rate_limit',
    'Rate limit exceeded for the request',
  ]) {
    const message = normalizeUxError(new Error(raw), 'signup')
    assert.equal(
      message,
      'You have made too many attempts in a short time. Wait about an hour, then try again.',
      `raw: ${raw}`,
    )
    assert.ok(!message.includes('could not create the account'))
  }
})
