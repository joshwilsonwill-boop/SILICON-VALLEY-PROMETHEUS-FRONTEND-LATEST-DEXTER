import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAssemblyAITranscriptionStatus } from '@/lib/api/assemblyai'
import { uploadTranscriptToR2 } from '@/lib/r2/upload-transcript'
import { R2Keys } from '@/lib/r2/keys'
import { normalizeAssemblyAITranscript } from '@/lib/server/direct-transcription'

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: assetId } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 1. Fetch asset record
    const { data: asset, error: assetError } = await supabase
      .from('source_assets')
      .select('*')
      .eq('id', assetId)
      .eq('user_id', user.id)
      .single()

    if (assetError || !asset) {
      return NextResponse.json({ error: 'Asset not found' }, { status: 404 })
    }

    if (!asset.transcript_job_id) {
      return NextResponse.json({ error: 'Asset has no transcript job ID' }, { status: 400 })
    }

    // If already completed, return current state
    if (asset.transcript_status === 'completed') {
      return NextResponse.json({ status: 'completed', r2Key: asset.transcript_r2_key })
    }

    // 2. Poll AssemblyAI
    const assemblyResponse = await getAssemblyAITranscriptionStatus(asset.transcript_job_id)

    if (assemblyResponse.status === 'queued' || assemblyResponse.status === 'processing') {
      // Update DB if it moved from queued to transcribing
      const nextStatus = assemblyResponse.status === 'processing' ? 'transcribing' : 'queued'
      if (asset.transcript_status !== nextStatus) {
        await supabase
          .from('source_assets')
          .update({ transcript_status: nextStatus })
          .eq('id', assetId)
      }
      return NextResponse.json({ status: nextStatus })
    }

    if (assemblyResponse.status === 'completed') {
      // 3. Normalize segments and save to R2
      const bucket = process.env.R2_BUCKET_SOURCES || 'prometheus-sources'
      const r2Key = R2Keys.transcript(user.id, asset.project_id, assetId)
      const segments = normalizeAssemblyAITranscript(assemblyResponse)
      
      await uploadTranscriptToR2(bucket, r2Key, assemblyResponse).catch((err) => {
        console.warn('[TranscriptSync] R2 upload warning:', err)
      })

      // 4. Update source_assets
      const { error: updateError } = await supabase
        .from('source_assets')
        .update({
          transcript_status: 'completed',
          transcript_r2_key: r2Key,
          transcript_completed_at: new Date().toISOString(),
          transcript_synced_at: new Date().toISOString(),
          transcript_error: null,
          transcript_text: assemblyResponse.text || null,
        })
        .eq('id', assetId)

      if (updateError) throw updateError

      // 5. Update durable_jobs with artifacts.transcript for the editor
      const { data: jobRows } = await supabase
        .from('durable_jobs')
        .select('id, artifacts')
        .eq('project_id', asset.project_id)
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })
        .limit(1)

      if (jobRows && jobRows.length > 0) {
        const targetJob = jobRows[0]
        const currentArtifacts = (targetJob.artifacts && typeof targetJob.artifacts === 'object')
          ? targetJob.artifacts
          : {}

        await supabase
          .from('durable_jobs')
          .update({
            status: 'completed',
            progress: 100,
            transcript_status: 'completed',
            transcript_text: assemblyResponse.text || null,
            artifacts: {
              ...currentArtifacts,
              transcript: segments,
            },
          })
          .eq('id', targetJob.id)
      }

      // 6. Update project source_profile
      const { data: projectRow } = await supabase
        .from('projects')
        .select('source_profile')
        .eq('id', asset.project_id)
        .eq('user_id', user.id)
        .single()

      if (projectRow) {
        const currentProfile = (projectRow.source_profile && typeof projectRow.source_profile === 'object')
          ? projectRow.source_profile
          : {}

        await supabase
          .from('projects')
          .update({
            source_profile: {
              ...currentProfile,
              transcript: segments,
            },
          })
          .eq('id', asset.project_id)
      }

      return NextResponse.json({ status: 'completed', r2Key, segmentsCount: segments.length })
    }

    if (assemblyResponse.status === 'error') {
      await supabase
        .from('source_assets')
        .update({
          transcript_status: 'failed',
          transcript_error: assemblyResponse.error || 'AssemblyAI job failed'
        })
        .eq('id', assetId)
      
      return NextResponse.json({ status: 'failed', error: assemblyResponse.error })
    }

    return NextResponse.json({ status: asset.transcript_status })

  } catch (err) {
    console.error('[api/assets/[id]/transcript/sync] POST error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to sync transcript' },
      { status: 500 }
    )
  }
}
