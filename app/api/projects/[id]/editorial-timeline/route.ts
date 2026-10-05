import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { applyEditorialTimelinePatch, editorialTimelinePatchSchema, readBackendEditorialTimeline } from '@/lib/editor/editorial-timeline-state'

export const runtime = 'nodejs'
const requestSchema = z.object({
  sourceAssetId: z.string().nullable(),
  patch: editorialTimelinePatchSchema,
})

async function context(params: Promise<{ id: string }>) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  return { id, supabase, user: error ? null : user }
}

async function findAuthorizedProject(supabase: any, projectId: string, userId: string) {
  const { data: ownProject, error: ownError } = await supabase
    .from('projects')
    .select('editor_state, source_asset_id, animation_plan, updated_at, user_id, workspace_id')
    .eq('id', projectId)
    .eq('user_id', userId)
    .maybeSingle()
  if (ownProject && !ownError) return { project: ownProject, isOwner: true }

  const { data: sharedProject, error: sharedError } = await supabase
    .from('projects')
    .select('editor_state, source_asset_id, animation_plan, updated_at, user_id, workspace_id')
    .eq('id', projectId)
    .maybeSingle()
  if (sharedProject && !sharedError) return { project: sharedProject, isOwner: false }

  return { project: null, isOwner: false }
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id, supabase, user } = await context(params)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { project: data } = await findAuthorizedProject(supabase, id, user.id)
  if (!data) return NextResponse.json({ error: 'Project not found.' }, { status: 404 })
  return NextResponse.json({ timeline: readBackendEditorialTimeline(data.editor_state, data.source_asset_id ?? null, data.animation_plan) }, { headers: { 'Cache-Control': 'no-store' } })
}

/** Operation patches preserve unrelated editor state and concurrent backend cues. */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id, supabase, user } = await context(params)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const parsed = requestSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Invalid timeline edit.', details: parsed.error.flatten() }, { status: 400 })

  for (let attempt = 0; attempt < 3; attempt++) {
    const { project: data, isOwner } = await findAuthorizedProject(supabase, id, user.id)
    if (!data) return NextResponse.json({ error: 'Project not found.' }, { status: 404 })
    if ((data.source_asset_id ?? null) !== parsed.data.sourceAssetId) return NextResponse.json({ error: 'The source video changed. Reload the timeline before editing.' }, { status: 409 })
    const timeline = applyEditorialTimelinePatch(readBackendEditorialTimeline(data.editor_state, parsed.data.sourceAssetId, data.animation_plan), parsed.data.patch)
    const editorState = data.editor_state && typeof data.editor_state === 'object' ? data.editor_state : {}
    let updateQuery = supabase.from('projects')
      .update({ editor_state: { ...editorState, editorialTimeline: timeline }, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('updated_at', data.updated_at)
    if (isOwner) {
      updateQuery = updateQuery.eq('user_id', user.id)
    }
    const { data: updated, error: saveError } = await updateQuery
      .select('id').maybeSingle()
    if (saveError) return NextResponse.json({ error: 'Unable to save the editorial timeline.' }, { status: 500 })
    if (updated) return NextResponse.json({ timeline })
  }
  return NextResponse.json({ error: 'The timeline changed during this edit. Try again.' }, { status: 409 })
}
