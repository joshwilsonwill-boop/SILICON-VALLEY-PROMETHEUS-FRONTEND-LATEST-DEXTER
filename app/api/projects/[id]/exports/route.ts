import { NextRequest, NextResponse } from 'next/server'
import { ExportService } from '@/lib/exports/service'
import { createClient } from '@/lib/supabase/server'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: projectId } = await params
    const body = await req.json().catch(() => ({}))
    
    const projectExport = await ExportService.createProjectExport(projectId, {
      preset: body.preset,
      metadata: body.metadata,
    })

    return NextResponse.json({ export: projectExport })
  } catch (error: any) {
    console.error('[EXPORT_POST]', error)

    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (error.message === 'Project not found or access denied') {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    return NextResponse.json(
      { error: 'Internal Server Error', message: error.message },
      { status: 500 }
    )
  }
}
