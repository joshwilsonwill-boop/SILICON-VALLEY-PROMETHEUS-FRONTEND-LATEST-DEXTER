const PASSWORD_MIN_LENGTH = 8

const PASSWORD_COMPLEXITY = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z0-9]).+$/

export const PASSWORD_POLICY_HINT =
  'Password needs an uppercase letter, a lowercase letter, a number, and a special character.'

export function getPasswordPolicyError(password: string): string | null {
  if (!password || password.length < PASSWORD_MIN_LENGTH) {
    return 'Password must be at least 8 characters.'
  }
  if (!PASSWORD_COMPLEXITY.test(password)) {
    return PASSWORD_POLICY_HINT
  }
  return null
}
