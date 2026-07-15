import { NextResponse } from 'next/server'
import { z } from 'zod'

import { createClient } from '@/lib/supabase/server'

const usernameSchema = z.object({
  username: z.string().trim().min(2, 'Username must be at least 2 characters').max(32).regex(/^[a-zA-Z0-9_.-]+$/, 'Use letters, numbers, dots, dashes, or underscores'),
})

export async function PATCH(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const parsed = usernameSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid username' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('profiles')
    .upsert(
      { id: user.id, email: user.email ?? null, username: parsed.data.username, updated_at: new Date().toISOString() },
      { onConflict: 'id' },
    )
    .select('id, username, display_name, avatar_url, email')
    .single()

  if (error?.code === '23505') return NextResponse.json({ error: 'Username already taken' }, { status: 409 })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true, profile: data })
}
