import { createClient } from '@/lib/supabase/server'

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  return Response.json({ error: 'Edited video rendering is unavailable in this export flow. You can download the original source from Export.', code: 'RENDER_UNAVAILABLE' }, { status: 503 })
}
