import { configuredOAuthProviders } from '@/lib/oauth/capabilities'
import { createClient } from '@/lib/supabase/server'
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  return Response.json({ providers: configuredOAuthProviders() }, { headers: { 'Cache-Control': 'no-store' } })
}
