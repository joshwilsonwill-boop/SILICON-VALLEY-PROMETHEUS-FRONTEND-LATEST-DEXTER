import { NextRequest, NextResponse } from 'next/server'

import { sourceControlPlaneErrorResponse } from '@/lib/api/source-control-plane-errors'
import { deleteR2Object } from '@/lib/r2/delete-object'
import { createClient } from '@/lib/supabase/server'

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: assetId } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 })

    const { data: asset, error } = await supabase.from('source_assets')
      .select('id, storage_bucket, storage_path').eq('id', assetId).eq('user_id', user.id).single()
    if (error || !asset) return NextResponse.json({ error: 'Asset not found.', code: 'SOURCE_ASSET_NOT_FOUND' }, { status: 404 })

    // Object deletion first avoids permanently orphaning storage. If the DB RPC
    // subsequently fails, retry converges because R2 deletion is idempotent.
    if (asset.storage_path) {
      try {
        await deleteR2Object(asset.storage_bucket || process.env.R2_BUCKET_SOURCES || 'prometheus-sources', asset.storage_path)
      } catch (deleteError) {
        const name = deleteError && typeof deleteError === 'object' ? (deleteError as { name?: string }).name : ''
        if (name !== 'NoSuchKey' && name !== 'NotFound') throw deleteError
      }
    }

    const { data: deleted, error: rpcError } = await supabase.rpc('maul_delete_source_asset_metadata', { p_asset_id: assetId })
    if (rpcError) return sourceControlPlaneErrorResponse(rpcError, 'SOURCE_DELETE_FAILED', 'Failed to delete source metadata.')
    return NextResponse.json({ ok: true, ...deleted })
  } catch (err) {
    console.error('[ASSET_DELETE_ERROR]', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Internal Server Error', code: 'SOURCE_DELETE_FAILED', retryable: true }, { status: 500 })
  }
}
