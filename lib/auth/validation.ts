import { z } from 'zod'
import { getPasswordPolicyError } from './password'

export const emailSchema = z.string().trim().email('Enter a valid email.')
export const displayNameSchema = z.string().trim().min(2, 'Use at least 2 characters').max(50, 'Keep display name under 50 characters').regex(/^[\p{L}\p{N}][\p{L}\p{N} .'-]*$/u, 'Use letters, numbers, spaces, dots, apostrophes, or hyphens')
export const usernameSchema = z.string().trim().min(2, 'Username must be at least 2 characters').max(32, 'Keep username under 32 characters').regex(/^[a-zA-Z0-9_.-]+$/, 'Use letters, numbers, dots, dashes, or underscores')
export const signupSchema = z.object({
  fullName: displayNameSchema,
  email: emailSchema,
  password: z.string().superRefine((value, context) => {
    const message = getPasswordPolicyError(value)
    if (message) context.addIssue({ code: z.ZodIssueCode.custom, message })
  }),
  next: z.string().optional(),
  captchaToken: z.string().nullable().optional(),
})

export const ENABLED_OAUTH_PROVIDERS = ['google', 'github'] as const
