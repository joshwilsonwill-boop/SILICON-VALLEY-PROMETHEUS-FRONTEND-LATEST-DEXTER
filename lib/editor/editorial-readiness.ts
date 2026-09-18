import {findTranscriptSilenceCuts, type TimelineCutRange} from '@/lib/editor/silence-cuts'
import type {SourceAnalysisResponse} from '@/lib/source-analysis'
import type {TranscriptSegment} from '@/lib/types'

type JsonObject = Record<string, unknown>

export type EditorialRecommendation = {
  id: string
  title: string
  rationale: string | null
  startSec: number | null
  endSec: number | null
}

export type EditorialReadiness = {
  analysisJobId: string
  sourceAssetId: string
  summary: string | null
  transcriptSegmentCount: number
  motionSegmentCount: number
  recommendations: EditorialRecommendation[]
  silenceAssessment: 'suggested' | 'none' | 'insufficient-transcript'
  silenceCuts: TimelineCutRange[]
}

const object = (value: unknown): JsonObject =>
  value && typeof value === 'object' && !Array.isArray(value) ? value as JsonObject : {}

const text = (value: unknown) => typeof value === 'string' && value.trim() ? value.trim() : null

const number = (value: unknown) => Number.isFinite(Number(value)) ? Number(value) : null

function durationSec(snapshot: JsonObject) {
  const metadata = object(snapshot.metadata)
  const milliseconds = number(metadata.durationMs ?? metadata.duration_ms)
  return milliseconds && milliseconds > 0 ? milliseconds / 1000 : undefined
}

function recommendations(snapshot: JsonObject): EditorialRecommendation[] {
  const editorial = object(snapshot.editorialAnalysis ?? snapshot.editorial_analysis)
  const entries = Array.isArray(editorial.recommendations) ? editorial.recommendations : []
  return entries.flatMap((entry, index) => {
    const recommendation = object(entry)
    const title = text(recommendation.title)
    if (!title) return []
    const rangeCandidate = recommendation.rangeMs ?? recommendation.range_ms
    const range = Array.isArray(rangeCandidate) ? rangeCandidate : []
    const startMs = number(range[0])
    const endMs = number(range[1])
    return [{
      id: text(recommendation.id) ?? `recommendation-${index}`,
      title,
      rationale: text(recommendation.rationale),
      startSec: startMs === null ? null : startMs / 1000,
      endSec: endMs === null ? null : endMs / 1000,
    }]
  })
}

function motionSegmentCount(snapshot: JsonObject) {
  const motion = object(snapshot.motion)
  return Array.isArray(motion.segments) ? motion.segments.length : 0
}

/**
 * Turns a completed source-analysis snapshot into a reviewable client-side edit
 * plan. It proposes only cuts supported by aligned transcript timestamps.
 */
export function buildEditorialReadiness({
  analysis,
  transcript,
  minSilenceDurationSec = 0.4,
}: {
  analysis: SourceAnalysisResponse
  transcript: TranscriptSegment[] | null | undefined
  minSilenceDurationSec?: number
}): EditorialReadiness | null {
  if (analysis.status !== 'completed') return null

  const snapshot = object(analysis.snapshot)
  const editorial = object(snapshot.editorialAnalysis ?? snapshot.editorial_analysis)
  const normalizedTranscript = transcript ?? []
  const silenceCuts = findTranscriptSilenceCuts(
    normalizedTranscript,
    minSilenceDurationSec,
    durationSec(snapshot),
  )

  return {
    analysisJobId: analysis.jobId,
    sourceAssetId: analysis.sourceAssetId,
    summary: text(editorial.summary),
    transcriptSegmentCount: normalizedTranscript.length,
    motionSegmentCount: motionSegmentCount(snapshot),
    recommendations: recommendations(snapshot),
    silenceAssessment: normalizedTranscript.length < 2
      ? 'insufficient-transcript'
      : silenceCuts.length > 0 ? 'suggested' : 'none',
    silenceCuts,
  }
}
