import { NextResponse } from 'next/server'
import { ProjectService } from '@/lib/projects/service'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const projects = await ProjectService.listProjectCards()
    return NextResponse.json({ success: true, projects })
  } catch (err) {
    console.error('[api/projects] GET error:', err)
    return NextResponse.json(
      { success: false, error: { message: err instanceof Error ? err.message : 'Failed to fetch projects' } },
      { status: err instanceof Error && err.message === 'Unauthorized' ? 401 : 500 }
    )
  }
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json().catch(() => ({}))
    console.log('[api/projects] POST payload:', body)
    
    const project = await ProjectService.createProject({ 
      title: body.title || body.name,
      description: body.description,
      template: body.template,
      prompt: body.prompt,
      previewKind: body.previewKind,
      sourceProfile: body.sourceProfile,
      sourceAssetId: body.sourceAssetId,
      workspaceId: body.workspaceId,
    })
    
    return NextResponse.json({ success: true, project })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to create project'
    console.error('[api/projects] POST fatal error:', message, err)
    
    return NextResponse.json(
      { success: false, error: { message } },
      { status: message === 'Unauthorized' ? 401 : 500 }
    )
  }
}
