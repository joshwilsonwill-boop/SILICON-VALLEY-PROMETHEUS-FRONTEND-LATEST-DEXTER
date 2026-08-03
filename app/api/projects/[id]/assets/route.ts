import { HeadObjectCommand } from '@aws-sdk/client-s3'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { ProjectService } from '@/lib/projects/service'
import { getPresignedGetUrl } from '@/lib/r2/presigned-url'
import { requireOwnedProjectSourceKey } from '@/lib/r2/project-source-multipart'
import { r2Client } from '@/lib/r2/client'
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

    // Never trust the browser's claim that completion succeeded. R2 HEAD is the
    // commit witness and the metadata written at initiation binds object identity.
    const head = await r2Client.send(new HeadObjectCommand({
      Bucket: keyContext.bucket,
      Key: keyContext.key,
    }))
    const verifiedSizeBytes = Number(head.ContentLength)
    const expectedSizeBytes = Number(sizeBytes)
    const metadata = head.Metadata ?? {}
    if (!Number.isSafeInteger(verifiedSizeBytes) || verifiedSizeBytes <= 0 || verifiedSizeBytes !== expectedSizeBytes) {
      return NextResponse.json(
        { error: 'R2 object size does not match the source registration.', code: 'SOURCE_SIZE_MISMATCH', retryable: false },
        { status: 409 },
      )
    }
    if (
      metadata['asset-id'] !== assetId
      || metadata['project-id'] !== projectId
      || metadata['user-id'] !== user.id
      || Number(metadata['size-bytes']) !== verifiedSizeBytes
    ) {
      return NextResponse.json(
        { error: 'R2 object identity does not match this source asset.', code: 'SOURCE_IDENTITY_MISMATCH', retryable: false },
        { status: 409 },
      )
    }
    if (head.ContentType && head.ContentType.toLowerCase() !== mimeType.trim().toLowerCase()) {
      return NextResponse.json(
        { error: 'R2 object MIME type does not match this source asset.', code: 'SOURCE_MIME_MISMATCH', retryable: false },
        { status: 409 },
      )
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
    const nextAssetBytes = verifiedSizeBytes

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
        size_bytes: verifiedSizeBytes,
        duration_ms: durationMs,
        width: width,
        height: height,
        profile: profile || {},
      }, { onConflict: 'id' })
      .select()
      .single()

    if (assetError) throw assetError

    // These writes are retry-convergent: the asset UUID is the idempotency key,
    // and the durable job UUID deliberately equals the source asset UUID.
    await ProjectService.updateProject(projectId, {
      sourceAssetId: assetId
    })

    const sourceJobMetadata = {
      pipeline_version: 1,
      source_asset_id: assetId,
      source_bucket: keyContext.bucket,
      source_etag: head.ETag ?? null,
      source_mime_type: mimeType,
      source_object_key: keyContext.key,
      source_size_bytes: verifiedSizeBytes,
    }
    const isMaulVideo = mimeType.toLowerCase().startsWith('video/')
    if (isMaulVideo) {
      const { error: supersedeError } = await supabase
        .from('durable_jobs')
        .update({
          status: 'failed',
          progress: 100,
          error_message: 'SOURCE_SUPERSEDED: project now points to a newer source asset.',
        })
        .eq('project_id', projectId)
        .eq('user_id', user.id)
        .eq('type', 'video_analysis')
        .in('status', ['pending', 'processing'])
        .neq('id', assetId)
      if (supersedeError) throw supersedeError
    }
    const { data: existingJob, error: existingJobError } = await supabase
      .from('durable_jobs')
      .select('*')
      .eq('id', assetId)
      .eq('user_id', user.id)
      .maybeSingle()
    if (existingJobError) throw existingJobError

    let job = existingJob
    if (!job && isMaulVideo) {
      const { data: insertedJob, error: insertJobError } = await supabase
        .from('durable_jobs')
        .insert({
          id: assetId,
          user_id: user.id,
          project_id: projectId,
          type: 'video_analysis',
          status: 'pending',
          progress: 0,
          result_metadata: sourceJobMetadata,
        })
        .select()
        .single()
      if (insertJobError) {
        // A concurrent identical registration may have inserted first.
        if (insertJobError.code !== '23505') throw insertJobError
        const { data: racedJob, error: racedJobError } = await supabase
          .from('durable_jobs')
          .select('*')
          .eq('id', assetId)
          .eq('user_id', user.id)
          .single()
        if (racedJobError) throw racedJobError
        job = racedJob
      } else {
        job = insertedJob
      }
    }

    // Claim transcription by conditional state transition before calling the
    // provider. Concurrent/retried registration requests cannot both win.
    if (mimeType.startsWith('video/') || mimeType.startsWith('audio/')) {
      const { data: transcriptionClaim, error: claimError } = await supabase
        .from('source_assets')
        .update({
          transcript_status: 'transcribing',
          transcript_error: null,
          transcript_started_at: new Date().toISOString(),
        })
        .eq('id', assetId)
        .eq('transcript_status', 'idle')
        .is('transcript_job_id', null)
        .select('id')
        .maybeSingle()
      if (claimError) throw claimError

      if (transcriptionClaim) {
        try {
          if (!process.env.ASSEMBLYAI_API_KEY) {
            console.warn('[api/projects/[id]/assets] ASSEMBLYAI_API_KEY missing. Skipping transcription.')
            await supabase.from('source_assets').update({ transcript_status: 'skipped' }).eq('id', assetId)
          } else {
            const sourceUrl = await getPresignedGetUrl(keyContext.bucket, keyContext.key)
            const transcriptResponse = await startAssemblyAITranscription({ audio_url: sourceUrl })
            await supabase.from('source_assets').update({
              transcript_status: 'queued',
              transcript_job_id: transcriptResponse.id,
              transcript_provider: 'assemblyai',
            }).eq('id', assetId).eq('transcript_status', 'transcribing')
          }
        } catch (transcribeErr) {
          console.error('[api/projects/[id]/assets] Failed to start transcription:', transcribeErr)
          await supabase.from('source_assets').update({
            transcript_status: 'failed',
            transcript_error: transcribeErr instanceof Error ? transcribeErr.message : 'Unknown error'
          }).eq('id', assetId).eq('transcript_status', 'transcribing')
        }
      }
    }

    const { data: committedAsset, error: committedAssetError } = await supabase
      .from('source_assets')
      .select('*')
      .eq('id', assetId)
      .eq('user_id', user.id)
      .single()
    if (committedAssetError) throw committedAssetError

    return NextResponse.json({ asset: committedAsset, job })
  } catch (err) {
    console.error('[api/projects/[id]/assets] POST error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to register asset' },
      { status: err instanceof Error && err.message === 'Unauthorized' ? 401 : 500 }
    )
  }
}
