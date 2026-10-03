import { NextResponse } from 'next/server'
import { z } from 'zod'
import { displayNameSchema as fieldSchema } from '@/lib/auth/validation'

import { createClient } from '@/lib/supabase/server'

const displayNameSchema = z.object({ display_name: fieldSchema })

export async function PATCH(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const parsed = displayNameSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid display name' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('profiles')
    .upsert(
      { id: user.id, email: user.email ?? null, display_name: parsed.data.display_name, updated_at: new Date().toISOString() },
      { onConflict: 'id' },
    )
    .select('id, username, display_name, avatar_url, email')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true, profile: data })
}
