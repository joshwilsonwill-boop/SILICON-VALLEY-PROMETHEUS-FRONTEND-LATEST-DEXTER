import { NextResponse } from 'next/server'
import { ExportService } from '@/lib/exports/service'

export async function GET(_request: Request, {params}: {params: Promise<{id: string}>}) {
  try {
    const {id} = await params
    const exports = await ExportService.listProjectExports(id)
    return NextResponse.json({exports}, {headers: {'Cache-Control': 'private, no-store'}})
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({error: 'Unauthorized'}, {status: 401})
    }
    return NextResponse.json({error: 'Unable to load render history'}, {status: 500})
  }
}
