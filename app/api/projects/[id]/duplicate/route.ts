import { NextResponse } from 'next/server'

import { ProjectService } from '@/lib/projects/service'
import { createClient } from '@/lib/supabase/server'

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const project = await ProjectService.duplicateProject(id)

    return NextResponse.json({
      success: true,
      project,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to duplicate project'
    console.error(`[api/projects/${await params.then((value) => value.id).catch(() => 'unknown')}/duplicate] POST error:`, err)

    return NextResponse.json(
      { success: false, error: { message } },
      { status: message === 'Unauthorized' ? 401 : 500 },
    )
  }
}
