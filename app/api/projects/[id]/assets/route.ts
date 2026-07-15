import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { ProjectService } from '@/lib/projects/service'
import { getPresignedGetUrl } from '@/lib/r2/presigned-url'
import { requireOwnedProjectSourceKey } from '@/lib/r2/project-source-multipart'
import { startAssemblyAITranscription } from '@/lib/api/assemblyai'
import { formatStorage, getStorageLimit, getStorageTierFromPlan } from '@/lib/storage-limits'

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Confirm user owns the project and get the source_asset_id
    const project = await ProjectService.getProject(projectId)
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    if (!project.sourceAssetId) {
      return NextResponse.json({ error: 'Project has no source asset' }, { status: 404 })
    }

    // Fetch the matching source_assets row
    const { data: asset, error: assetError } = await supabase
      .from('source_assets')
      .select('*')
      .eq('id', project.sourceAssetId)
      .eq('project_id', projectId)
      .eq('user_id', user.id)
      .single()

    if (assetError || !asset) {
      return NextResponse.json({ error: 'Source asset record not found' }, { status: 404 })
    }

    // Generate a presigned R2 GET URL
    const bucket = asset.storage_bucket || process.env.R2_BUCKET_SOURCES || 'prometheus-sources'
    const objectKey = asset.storage_path

    if (!objectKey) {
      return NextResponse.json({ error: 'Asset storage path is missing' }, { status: 500 })
    }

    const sourceUrl = await getPresignedGetUrl(bucket, objectKey)

    return NextResponse.json({
      asset,
      source: {
        url: sourceUrl,
        expiresIn: 3600 // 1 hour as per getPresignedGetUrl default
      }
    })
  } catch (err) {
    console.error('[api/projects/[id]/assets] GET error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to recover source asset' },
      { status: 500 }
    )
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params
    const body = await req.json().catch(() => ({}))
    const {
      assetId,
      storageProvider = 'r2',
      bucket,
      objectKey,
      filename,
      mimeType,
      sizeBytes,
      durationMs,
      width,
      height,
      profile
    } = body

    if (typeof assetId !== 'string' || typeof objectKey !== 'string' || !assetId || !objectKey) {
      return NextResponse.json({ error: 'Missing assetId or objectKey' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (typeof mimeType !== 'string' || !mimeType.trim()) {
      return NextResponse.json({ error: 'Missing source mime type' }, { status: 400 })
    }

    const keyContext = await requireOwnedProjectSourceKey(projectId, objectKey)
    if ('error' in keyContext) {
      return NextResponse.json({ error: keyContext.error }, { status: keyContext.status })
    }

    // Confirm user owns the project
    const project = await ProjectService.getProject(projectId)
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    const { data: subscription, error: subscriptionError } = await supabase
      .from('dodo_subscriptions')
      .select('tier, status')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (subscriptionError) throw subscriptionError

    const hasPaidAccess = subscription?.status === 'active'
    const tier = getStorageTierFromPlan(hasPaidAccess ? subscription?.tier ?? 'free' : 'free')
    const storageLimit = getStorageLimit(tier)
    const { data: existingAssets, error: existingAssetsError } = await supabase
      .from('source_assets')
      .select('size_bytes')
      .eq('user_id', user.id)
      .neq('id', assetId)

    if (existingAssetsError) throw existingAssetsError

    const usedBytes = (existingAssets ?? []).reduce((total, asset) => total + (Number(asset.size_bytes) || 0), 0)
    const nextAssetBytes = Number(sizeBytes) || 0

    if (usedBytes + nextAssetBytes > storageLimit) {
      return NextResponse.json(
        {
          error: `Storage limit exceeded. Your ${tier} plan includes ${formatStorage(storageLimit)}. You are using ${formatStorage(usedBytes)}, and this asset is ${formatStorage(nextAssetBytes)}.`,
        },
        { status: 413 },
      )
    }

    // Insert source asset metadata
    const { data: existingAsset, error: existingAssetError } = await supabase
      .from('source_assets')
      .select('id, project_id, user_id')
      .eq('id', assetId)
      .maybeSingle()

    if (existingAssetError) throw existingAssetError
    if (existingAsset && (existingAsset.project_id !== projectId || existingAsset.user_id !== user.id)) {
      return NextResponse.json({ error: 'Asset belongs to a different project' }, { status: 409 })
    }

    const { data: asset, error: assetError } = await supabase
      .from('source_assets')
      .upsert({
        id: assetId,
        project_id: projectId,
        user_id: user.id,
        storage_bucket: keyContext.bucket,
        storage_path: keyContext.key,
        original_filename: filename,
        mime_type: mimeType,
        size_bytes: sizeBytes,
        duration_ms: durationMs,
        width: width,
        height: height,
        profile: profile || {},
      }, { onConflict: 'id' })
      .select()
      .single()

    if (assetError) throw assetError

    // Update project with the new source_asset_id
    await ProjectService.updateProject(projectId, {
      sourceAssetId: assetId
    })

    // Phase 1D: Trigger AssemblyAI transcription
    if (mimeType.startsWith('video/') || mimeType.startsWith('audio/')) {
      try {
        const assemblyAiKey = process.env.ASSEMBLYAI_API_KEY
        if (!assemblyAiKey) {
          console.warn('[api/projects/[id]/assets] ASSEMBLYAI_API_KEY missing. Skipping transcription.')
          await supabase
            .from('source_assets')
            .update({ transcript_status: 'skipped' })
            .eq('id', assetId)
        } else {
          // Generate a temporary signed GET URL for AssemblyAI
          const sourceUrl = await getPresignedGetUrl(bucket, objectKey)
          
          const transcriptResponse = await startAssemblyAITranscription({
            audio_url: sourceUrl,
          })

          await supabase
            .from('source_assets')
            .update({
              transcript_status: 'queued',
              transcript_job_id: transcriptResponse.id,
              transcript_provider: 'assemblyai',
              transcript_started_at: new Date().toISOString(),
            })
            .eq('id', assetId)
        }
      } catch (transcribeErr) {
        console.error('[api/projects/[id]/assets] Failed to start transcription:', transcribeErr)
        await supabase
          .from('source_assets')
          .update({ 
            transcript_status: 'failed',
            transcript_error: transcribeErr instanceof Error ? transcribeErr.message : 'Unknown error'
          })
          .eq('id', assetId)
      }
    }

    return NextResponse.json({ asset })
  } catch (err) {
    console.error('[api/projects/[id]/assets] POST error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to register asset' },
      { status: err instanceof Error && err.message === 'Unauthorized' ? 401 : 500 }
    )
  }
}
