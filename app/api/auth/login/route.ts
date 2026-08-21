import { NextResponse } from 'next/server'

import { createClient } from '@/lib/supabase/server'

import { getErrorMessage, looksLikeEmailConfirmationError } from '../_utils'

type LoginBody = {
  email: string
  password: string
  next?: string
}

export async function POST(req: Request) {
  const startedAt = Date.now()
  try {
    const body = (await req.json()) as Partial<LoginBody>

    const payload = {
      email: body.email ?? '',
      password: body.password ?? '',
    }

    console.info('[api/auth/login] incoming', {
      email: payload.email,
      hasPassword: Boolean(payload.password),
      ip: req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? null,
    })

    const supabase = await createClient()
    const { data, error } = await supabase.auth.signInWithPassword(payload)

    if (error) {
      if (looksLikeEmailConfirmationError(error.message)) {
        return NextResponse.json(
          {
            error: getErrorMessage(error, 'Email confirmation required', 'verification'),
            requiresVerification: true,
          },
          { status: 403 },
        )
      }

      throw error
    }

    const user = data.user ?? null
    const requiresVerification = Boolean(user && !user.email_confirmed_at)

    console.info('[api/auth/login] ok', {
      ms: Date.now() - startedAt,
      requiresVerification,
      hasUser: Boolean(user),
      hasSession: Boolean(data.session),
    })

    return NextResponse.json({ user, requiresVerification })
  } catch (err) {
    const message = getErrorMessage(err, 'Login failed', 'login')
    console.error('[api/auth/login] error', {
      ms: Date.now() - startedAt,
      message,
      rawName: err instanceof Error ? err.name : typeof err,
      rawMessage: err instanceof Error ? err.message : String(err),
    })
    return NextResponse.json({ error: message }, { status: 401 })
  }
}
