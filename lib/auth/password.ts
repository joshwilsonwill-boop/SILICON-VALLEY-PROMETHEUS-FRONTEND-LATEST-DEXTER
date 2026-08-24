const PASSWORD_MIN_LENGTH = 8

export const PASSWORD_POLICY_HINT =
  'Password needs an uppercase letter, a lowercase letter, a number, and a special character.'

export function getPasswordPolicyError(password: string): string | null {
  if (!password || password.length < PASSWORD_MIN_LENGTH) {
    return 'Use at least 8 characters for your password.'
  }

  const missing: string[] = []
  if (!/[a-z]/.test(password)) missing.push('a lowercase letter')
  if (!/[A-Z]/.test(password)) missing.push('an uppercase letter')
  if (!/[0-9]/.test(password)) missing.push('a number')
  if (!/[^a-zA-Z0-9]/.test(password)) missing.push('a special character (e.g. !@#$%)')

  if (missing.length === 0) return null

  if (missing.length === 1) {
    return `Add ${missing[0]} to your password.`
  }
  return `Password still needs ${missing.slice(0, -1).join(', ')} and ${missing[missing.length - 1]}.`
}
