import 'server-only'

import { createClient } from '@/lib/supabase/server'
import { downloadTextFromR2 } from '@/lib/r2/download-text'

/**
 * Builds the project/video context the Prometheus chat assistant reasons over.
 *
 * Today chat only receives a bare `projectId`; this loader is what lets the
 * assistant know a video exists, how long it is, and what is being said (via
 * the AssemblyAI transcript synced to R2). Everything degrades to null instead
 * of throwing so the chat route always has a fallback answer path.
 */

export interface ProjectVideoContext {
  filename: string | null
  mimeType: string | null
  durationMs: number | null
  width: number | null
  height: number | null
  fps: number | null
}

export interface ProjectTranscriptContext {
  status: string | null
  /** Timecoded utterance lines when the full transcript is available, else a short preview. */
  text: string
  source: 'r2' | 'db-preview'
}

export interface ProjectChatContext {
  projectId: string
  title: string | null
  video: ProjectVideoContext | null
  transcript: ProjectTranscriptContext | null
}

const TRANSCRIPT_BUDGET_CHARS = 1_800
const CONTEXT_BUDGET_CHARS = 3_000

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  return value as Record<string, unknown>
}

function asNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function formatTimecode(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

function clipToBudget(text: string, budget: number): string {
  if (text.length <= budget) return text
  const headChars = Math.floor(budget * 0.6)
  const tailChars = budget - headChars - 40
  return `${text.slice(0, headChars).trim()}\n… (middle omitted) …\n${text.slice(text.length - tailChars).trim()}`
}

/**
 * Compacts an AssemblyAI transcript payload into timecoded utterance lines so
 * the model can cite positions like 0:25. Falls back to words grouped into
 * ~15s buckets, then to the plain text.
 */
function compactTranscript(rawJson: string): string | null {
  let parsed: unknown
  try {
    parsed = JSON.parse(rawJson)
  } catch {
    return null
  }
  const data = asRecord(parsed)
  if (!data) return null

  const utterances = Array.isArray(data.utterances) ? data.utterances : []
  if (utterances.length > 0) {
    const lines: string[] = []
    for (const utterance of utterances) {
      const record = asRecord(utterance)
      if (!record) continue
      const start = asNumber(record.start)
      const text = typeof record.text === 'string' ? record.text.trim() : ''
      if (!text) continue
      const speaker = typeof record.speaker === 'string' ? `Speaker ${record.speaker}: ` : ''
      lines.push(`[${start !== null ? formatTimecode(start) : '--:--'}] ${speaker}${text}`)
    }
    if (lines.length > 0) return clipToBudget(lines.join('\n'), TRANSCRIPT_BUDGET_CHARS)
  }

  const words = Array.isArray(data.words) ? data.words : []
  if (words.length > 0) {
    const lines: string[] = []
    let bucketStart: number | null = null
    let bucketWords: string[] = []
    const flush = () => {
      if (bucketStart !== null && bucketWords.length > 0) {
        lines.push(`[${formatTimecode(bucketStart)}] ${bucketWords.join(' ')}`)
      }
      bucketStart = null
      bucketWords = []
    }
    for (const word of words) {
      const record = asRecord(word)
      if (!record) continue
      const start = asNumber(record.start)
      const text = typeof record.text === 'string' ? record.text.trim() : ''
      if (!text || start === null) continue
      if (bucketStart === null) bucketStart = start
      if (start - bucketStart >= 15_000) {
        flush()
        bucketStart = start
      }
      bucketWords.push(text)
    }
    flush()
    if (lines.length > 0) return clipToBudget(lines.join('\n'), TRANSCRIPT_BUDGET_CHARS)
  }

  if (typeof data.text === 'string' && data.text.trim().length > 0) {
    return clipToBudget(data.text.trim(), TRANSCRIPT_BUDGET_CHARS)
  }

  return null
}

async function loadTranscript(asset: Record<string, unknown>): Promise<ProjectTranscriptContext | null> {
  const status = typeof asset.transcript_status === 'string' ? asset.transcript_status : null
  const r2Key = typeof asset.transcript_r2_key === 'string' ? asset.transcript_r2_key : null

  if (status === 'completed' && r2Key) {
    const bucket = process.env.R2_BUCKET_SOURCES || 'prometheus-sources'
    const raw = await downloadTextFromR2(bucket, r2Key, 200_000)
    if (raw) {
      const text = compactTranscript(raw)
      if (text) return { status, text, source: 'r2' }
    }
  }

  const preview = typeof asset.transcript_text === 'string' ? asset.transcript_text.trim() : ''
  if (preview.length > 0) {
    return { status, text: clipToBudget(preview, 500), source: 'db-preview' }
  }

  return status ? { status, text: '', source: 'db-preview' } : null
}

export async function loadProjectChatContext(projectId: string): Promise<ProjectChatContext | null> {
  if (!projectId || projectId === '__new__') return null

  try {
    const supabase = await createClient()

    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, title, source_asset_id, source_profile')
      .eq('id', projectId)
      .maybeSingle()

    if (projectError || !project) return null

    let video: ProjectVideoContext | null = null
    let transcript: ProjectTranscriptContext | null = null

    const sourceProfile = asRecord(project.source_profile)

    const { data: asset } = await supabase
      .from('source_assets')
      .select(
        'original_filename, mime_type, duration_ms, width, height, transcript_status, transcript_r2_key, transcript_text'
      )
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (asset) {
      video = {
        filename: typeof asset.original_filename === 'string' ? asset.original_filename : null,
        mimeType: typeof asset.mime_type === 'string' ? asset.mime_type : null,
        durationMs: asNumber(asset.duration_ms),
        width: asNumber(asset.width),
        height: asNumber(asset.height),
        fps: asNumber(sourceProfile?.fps),
      }
      transcript = await loadTranscript(asset as Record<string, unknown>)
    } else if (sourceProfile) {
      video = {
        filename: typeof sourceProfile.filename === 'string' ? sourceProfile.filename : null,
        mimeType: typeof sourceProfile.mimeType === 'string' ? sourceProfile.mimeType : null,
        durationMs: asNumber(sourceProfile.durationMs ?? sourceProfile.duration_ms),
        width: asNumber(sourceProfile.width),
        height: asNumber(sourceProfile.height),
        fps: asNumber(sourceProfile.fps),
      }
    }

    return {
      projectId,
      title: typeof project.title === 'string' ? project.title : null,
      video,
      transcript,
    }
  } catch (error) {
    console.warn('[prometheus-chat] failed to load project context', { projectId, error })
    return null
  }
}

/** Renders the context as a compact prompt block, hard-capped at ~3KB. */
export function formatProjectContextForPrompt(context: ProjectChatContext): string {
  const lines: string[] = [`Project: ${context.title ?? 'Untitled'} (id: ${context.projectId})`]

  if (context.video) {
    const { filename, durationMs, width, height, fps } = context.video
    const parts: string[] = []
    if (filename) parts.push(`file: ${filename}`)
    if (durationMs !== null) parts.push(`duration: ${formatTimecode(durationMs)} (${durationMs}ms)`)
    if (width && height) parts.push(`resolution: ${width}x${height}`)
    if (fps) parts.push(`fps: ${fps}`)
    if (parts.length > 0) lines.push(`Video — ${parts.join(', ')}`)
  } else {
    lines.push('Video: none uploaded yet.')
  }

  if (context.transcript) {
    if (context.transcript.text.length > 0) {
      lines.push(`Transcript (source: ${context.transcript.source}):\n${context.transcript.text}`)
    } else if (context.transcript.status && context.transcript.status !== 'completed') {
      lines.push(`Transcript: ${context.transcript.status}.`)
    }
  } else {
    lines.push('Transcript: not available.')
  }

  return clipToBudget(lines.join('\n'), CONTEXT_BUDGET_CHARS)
}
