import { NextResponse } from 'next/server'

import { buildAvatarObjectKey, getAvatarPublicUrl, uploadAvatarObject } from '@/lib/r2'
import { createClient } from '@/lib/supabase/server'

const MAX_FILE_SIZE = 5 * 1024 * 1024
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])

export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await request.formData()
  const file = formData.get('file')
  if (!(file instanceof File)) return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  if (!ALLOWED_TYPES.has(file.type)) return NextResponse.json({ error: 'Invalid file type. Use JPG, PNG, or WebP' }, { status: 400 })
  if (file.size > MAX_FILE_SIZE) return NextResponse.json({ error: 'File too large. Max 5MB' }, { status: 400 })

  const key = buildAvatarObjectKey(user.id)
  const publicUrl = getAvatarPublicUrl(key)
  try {
    await uploadAvatarObject({
      body: new Uint8Array(await file.arrayBuffer()),
      contentType: file.type,
      key,
    })
  } catch (error) {
    console.error('R2 avatar upload failed:', error)
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to upload avatar' }, { status: 500 })
  }
  const { data, error } = await supabase
    .from('profiles')
    .upsert(
      { id: user.id, email: user.email ?? null, avatar_url: publicUrl, updated_at: new Date().toISOString() },
      { onConflict: 'id' },
    )
    .select('id, username, display_name, avatar_url, email')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true, profile: data })
}
