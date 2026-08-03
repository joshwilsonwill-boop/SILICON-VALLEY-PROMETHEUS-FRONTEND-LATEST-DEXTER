import 'server-only'

import { createClient } from '@/lib/supabase/server'
import { downloadTextFromR2 } from '@/lib/r2/download-text'

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
  text: string
  source: 'source-snapshot' | 'r2' | 'db-preview'
  rangeMs: [number, number] | null
}

export interface ProjectEditorialAnalysisContext {
  summary: string
  pacing: 'slow' | 'balanced' | 'fast' | 'unknown'
  wordsPerMinute: number | null
  motionIntensity: number | null
  recommendations: Array<{ title: string; rationale: string; rangeMs: [number, number] | null }>
}

export interface ProjectChatContext {
  projectId: string
  title: string | null
  video: ProjectVideoContext | null
  transcript: ProjectTranscriptContext | null
  editorialAnalysis: ProjectEditorialAnalysisContext | null
  ingestionStatus: string | null
}

export type ProjectChatContextOptions = { playheadSec?: number | null }

const TRANSCRIPT_BUDGET_CHARS = 1_800
const CONTEXT_BUDGET_CHARS = 3_200

type CanonicalVideoContext = {
  status: string | null
  video: ProjectVideoContext | null
  transcript: ProjectTranscriptContext | null
  editorialAnalysis: ProjectEditorialAnalysisContext | null
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  return value as Record<string, unknown>
}

function asNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function asString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function formatTimecode(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

function clipToBudget(text: string, budget: number): string {
  if (text.length <= budget) return text
  const headChars = Math.floor(budget * 0.7)
  return `${text.slice(0, headChars).trim()}\n[remaining transcript omitted]\n${text.slice(-Math.max(0, budget - headChars - 34)).trim()}`
}

function normalizeRange(value: unknown): [number, number] | null {
  if (!Array.isArray(value) || value.length !== 2) return null
  const start = asNumber(value[0])
  const end = asNumber(value[1])
  return start !== null && end !== null && end >= start ? [start, end] : null
}

function compactWords(value: unknown): string {
  if (!Array.isArray(value)) return ''
  const lines: string[] = []
  let bucketStart: number | null = null
  let bucketWords: string[] = []
  const flush = () => {
    if (bucketStart !== null && bucketWords.length) lines.push(`[${formatTimecode(bucketStart)}] ${bucketWords.join(' ')}`)
    bucketStart = null
    bucketWords = []
  }
  for (const item of value) {
    const word = asRecord(item)
    const text = asString(word?.text)
    const start = asNumber(word?.start_ms ?? word?.startMs)
    if (!word || !text || start === null) continue
    if (bucketStart === null) bucketStart = start
    if (start - bucketStart >= 12_000) {
      flush()
      bucketStart = start
    }
    bucketWords.push(text)
  }
  flush()
  return clipToBudget(lines.join('\n'), TRANSCRIPT_BUDGET_CHARS)
}

function normalizeEditorialAnalysis(value: unknown): ProjectEditorialAnalysisContext | null {
  const analysis = asRecord(value)
  const summary = asString(analysis?.summary)
  if (!analysis || !summary) return null
  const pacingValue = asString(analysis.pacing)
  const pacing = pacingValue === 'slow' || pacingValue === 'balanced' || pacingValue === 'fast' ? pacingValue : 'unknown'
  const recommendations = Array.isArray(analysis.recommendations)
    ? analysis.recommendations.flatMap((item) => {
        const recommendation = asRecord(item)
        const title = asString(recommendation?.title)
        const rationale = asString(recommendation?.rationale)
        return title && rationale ? [{ title, rationale, rangeMs: normalizeRange(recommendation?.rangeMs) }] : []
      }).slice(0, 4)
    : []
  return {
    summary,
    pacing,
    wordsPerMinute: asNumber(analysis.wordsPerMinute),
    motionIntensity: asNumber(analysis.motionIntensity),
    recommendations,
  }
}

async function loadCanonicalVideoContext(
  projectId: string,
  playheadSec?: number | null,
): Promise<CanonicalVideoContext | null> {
  try {
    const supabase = await createClient()
    const rpc = supabase.rpc.bind(supabase) as unknown as (name: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: { message?: string } | null }>
    const { data, error } = await rpc('maul_get_chat_video_context', {
      p_project_id: projectId,
      p_playhead_ms: typeof playheadSec === 'number' && Number.isFinite(playheadSec) ? Math.max(0, Math.round(playheadSec * 1000)) : null,
      p_window_ms: 45_000,
    })
    if (error || !data) return null
    const result = asRecord(data)
    if (!result) return null
    const metadata = asRecord(result.metadata)
    const transcript = asRecord(result.transcript)
    const rangeMs = normalizeRange(result.range_ms)
    return {
      status: asString(result.status),
      video: metadata ? {
        filename: asString(result.filename),
        mimeType: asString(result.mime_type),
        durationMs: asNumber(metadata.durationMs),
        width: asNumber(metadata.width),
        height: asNumber(metadata.height),
        fps: asNumber(metadata.fps),
      } : null,
      transcript: transcript ? {
        status: asString(result.status),
        text: compactWords(transcript.mergedWords),
        source: 'source-snapshot',
        rangeMs,
      } : null,
      editorialAnalysis: normalizeEditorialAnalysis(result.editorial_analysis),
    }
  } catch {
    return null
  }
}

function compactTranscript(rawJson: string): string | null {
  try {
    const data = asRecord(JSON.parse(rawJson))
    if (!data) return null
    const utterances = Array.isArray(data.utterances) ? data.utterances : []
    if (utterances.length) {
      const lines = utterances.flatMap((item) => {
        const utterance = asRecord(item)
        const text = asString(utterance?.text)
        const start = asNumber(utterance?.start)
        return text ? [`[${start !== null ? formatTimecode(start) : '--:--'}] ${text}`] : []
      })
      if (lines.length) return clipToBudget(lines.join('\n'), TRANSCRIPT_BUDGET_CHARS)
    }
    return compactWords(data.words) || asString(data.text)
  } catch {
    return null
  }
}

async function loadLegacyTranscript(asset: Record<string, unknown>): Promise<ProjectTranscriptContext | null> {
  const status = asString(asset.transcript_status)
  const r2Key = asString(asset.transcript_r2_key)
  if (status === 'completed' && r2Key) {
    const raw = await downloadTextFromR2(process.env.R2_BUCKET_SOURCES || 'prometheus-sources', r2Key, 200_000)
    const text = raw ? compactTranscript(raw) : null
    if (text) return { status, text, source: 'r2', rangeMs: null }
  }
  const preview = asString(asset.transcript_text)
  return preview ? { status, text: clipToBudget(preview, 500), source: 'db-preview', rangeMs: null } : status ? { status, text: '', source: 'db-preview', rangeMs: null } : null
}

export async function loadProjectChatContext(projectId: string, options: ProjectChatContextOptions = {}): Promise<ProjectChatContext | null> {
  if (!projectId || projectId === '__new__') return null
  try {
    const supabase = await createClient()
    const { data: project, error } = await supabase.from('projects').select('id, title, source_profile').eq('id', projectId).maybeSingle()
    if (error || !project) return null

    const canonical = await loadCanonicalVideoContext(projectId, options.playheadSec)
    if (canonical?.video || canonical?.transcript || canonical?.editorialAnalysis || canonical?.status) {
      return { projectId, title: asString(project.title), video: canonical.video, transcript: canonical.transcript, editorialAnalysis: canonical.editorialAnalysis, ingestionStatus: canonical.status }
    }

    const sourceProfile = asRecord(project.source_profile)
    const { data: asset } = await supabase.from('source_assets').select('original_filename, mime_type, duration_ms, width, height, transcript_status, transcript_r2_key, transcript_text').eq('project_id', projectId).order('created_at', { ascending: false }).limit(1).maybeSingle()
    const video = asset ? {
      filename: asString(asset.original_filename), mimeType: asString(asset.mime_type), durationMs: asNumber(asset.duration_ms), width: asNumber(asset.width), height: asNumber(asset.height), fps: asNumber(sourceProfile?.fps),
    } : sourceProfile ? {
      filename: asString(sourceProfile.filename), mimeType: asString(sourceProfile.mimeType), durationMs: asNumber(sourceProfile.durationMs ?? sourceProfile.duration_ms), width: asNumber(sourceProfile.width), height: asNumber(sourceProfile.height), fps: asNumber(sourceProfile.fps),
    } : null
    return { projectId, title: asString(project.title), video, transcript: asset ? await loadLegacyTranscript(asset as Record<string, unknown>) : null, editorialAnalysis: null, ingestionStatus: null }
  } catch (error) {
    console.warn('[prometheus-chat] failed to load project context', { projectId, error })
    return null
  }
}

export function formatProjectContextForPrompt(context: ProjectChatContext): string {
  const lines: string[] = [`Project: ${context.title ?? 'Untitled'} (id: ${context.projectId})`]
  if (context.video) {
    const parts = [context.video.filename ? `file: ${context.video.filename}` : '', context.video.durationMs !== null ? `duration: ${formatTimecode(context.video.durationMs)}` : '', context.video.width && context.video.height ? `resolution: ${context.video.width}x${context.video.height}` : '', context.video.fps ? `fps: ${context.video.fps}` : ''].filter(Boolean)
    lines.push(parts.length ? `Video - ${parts.join(', ')}` : 'Video uploaded.')
  } else lines.push('Video: none uploaded yet.')
  if (context.ingestionStatus && context.ingestionStatus !== 'completed') lines.push(`Analysis status: ${context.ingestionStatus}; do not claim missing analysis is complete.`)
  if (context.editorialAnalysis) {
    const analysis = context.editorialAnalysis
    lines.push(`Saved editorial analysis: ${analysis.summary}`)
    if (analysis.recommendations.length) lines.push(`Saved recommendations:\n${analysis.recommendations.map((item) => `- ${item.title}: ${item.rationale}`).join('\n')}`)
  }
  if (context.transcript) {
    if (context.transcript.text) {
      const range = context.transcript.rangeMs ? `near ${formatTimecode(context.transcript.rangeMs[0])}-${formatTimecode(context.transcript.rangeMs[1])}` : 'sampled across the video'
      lines.push(`Transcript (${range}; source: ${context.transcript.source}):\n${context.transcript.text}`)
    } else if (context.transcript.status && context.transcript.status !== 'completed') lines.push(`Transcript: ${context.transcript.status}.`)
  } else lines.push('Transcript: not available.')
  return clipToBudget(lines.join('\n'), CONTEXT_BUDGET_CHARS)
}