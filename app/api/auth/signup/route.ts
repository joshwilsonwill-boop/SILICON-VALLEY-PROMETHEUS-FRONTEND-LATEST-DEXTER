import { NextResponse } from 'next/server'

import { buildAuthConfirmUrl } from '@/lib/auth/redirect'
import { ensureProfile } from '@/lib/supabase/profile'
import { createClient } from '@/lib/supabase/server'

import { getErrorMessage } from '../_utils'

type SignupBody = {
  fullName: string
  email: string
  password: string
  next?: string
  captchaToken?: string | null
}

export async function POST(req: Request) {
  const startedAt = Date.now()
  try {
    const body = (await req.json()) as Partial<SignupBody>

    const { captchaToken, next } = body
    const email = body.email ?? ''
    const password = body.password ?? ''
    const fullName = body.fullName ?? ''

    console.info('[api/auth/signup] incoming', {
      email,
      hasPassword: Boolean(password),
      fullNameLen: fullName.length,
      ip: req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? null,
    })

    const supabase = await createClient()
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
        captchaToken: captchaToken ?? undefined,
        emailRedirectTo: buildAuthConfirmUrl(req, next).toString(),
      },
    })

    if (error) {
      throw error
    }

    const user = data.user
    const requiresVerification = Boolean(user && !data.session)

    if (data.session) {
      // Email confirmation disabled: a session exists immediately, so this is
      // the only moment the server can create the profile row with the user's
      // own RLS context. With verification on, /auth/confirm does it instead.
      await ensureProfile(supabase)
    }

    console.info('[api/auth/signup] ok', {
      ms: Date.now() - startedAt,
      requiresVerification,
      hasUser: Boolean(user),
      hasSession: Boolean(data.session),
    })

    return NextResponse.json({ user, requiresVerification })
  } catch (err) {
    const rawMessage = err instanceof Error ? err.message.toLowerCase() : ''
    const message = rawMessage.includes('captcha') || rawMessage.includes('turnstile')
      ? 'Security check failed. Complete the verification and try again.'
      : getErrorMessage(err, 'Signup failed', 'signup')
    // Log the raw error, not the normalized message: the normalized text is
    // for the user, and it hides the actual Supabase/DB cause.
    console.error('[api/auth/signup] error', {
      ms: Date.now() - startedAt,
      message,
      rawName: err instanceof Error ? err.name : typeof err,
      rawMessage: err instanceof Error ? err.message : String(err),
    })
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
