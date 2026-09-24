import { NextResponse } from 'next/server'
import { ProjectService, type ProjectPatch } from '@/lib/projects/service'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  let projectId = 'unknown'
  try {
    const { id } = await params
    projectId = id
    const project = await ProjectService.getProject(id)
    return NextResponse.json({ success: true, project })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch project'
    console.error(`[api/projects/${projectId}] GET fatal error:`, message, err)
    
    return NextResponse.json(
      { success: false, error: { message } },
      { status: message === 'Unauthorized' ? 401 : 500 }
    )
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  let projectId = 'unknown'
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    projectId = id
    const body = (await req.json().catch(() => ({}))) as ProjectPatch
    const project = await ProjectService.updateProject(id, body)
    return NextResponse.json({ success: true, project })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to update project'
    console.error(`[api/projects/${projectId}] PATCH fatal error:`, message, err)
    
    return NextResponse.json(
      { success: false, error: { message } },
      { status: message === 'Unauthorized' ? 401 : 500 }
    )
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    await ProjectService.deleteProject(id)
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[api/projects/[id]] DELETE error:', err)
    return NextResponse.json(
      { success: false, error: { message: err instanceof Error ? err.message : 'Failed to delete project' } },
      { status: err instanceof Error && err.message === 'Unauthorized' ? 401 : 500 }
    )
  }
}
