import { NextResponse } from 'next/server'
import { emailSchema } from '@/lib/auth/validation'

import { buildAuthConfirmUrl } from '@/lib/auth/redirect'
import { createClient } from '@/lib/supabase/server'

import { getErrorMessage } from '../_utils'

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { email?: string }
    const parsed = emailSchema.safeParse(body.email)
    if (!parsed.success) return NextResponse.json({ error: 'Enter a valid email.' }, { status: 400 })
    const email = parsed.data

    const supabase = await createClient()
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: buildAuthConfirmUrl(req, '/reset-password').toString(),
    })

    if (error) {
      throw error
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    const message = getErrorMessage(err, 'Reset password failed')
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
