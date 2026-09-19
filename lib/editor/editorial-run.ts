import {findTranscriptSilenceCuts, type TimelineCutRange} from '@/lib/editor/silence-cuts'
import type {TranscriptSegment} from '@/lib/types'
import type {EditorialRecommendation} from '@/lib/editor/editorial-readiness'

export type EditorialCleanupRunStep = {
  id: string
  kind: 'review_transcript' | 'cut_silence' | 'review_recommendations'
  label: string
  state: 'complete' | 'skipped'
}

export type EditorialCleanupRun = {
  id: string
  prompt: string
  status: 'ready' | 'blocked'
  reason: string | null
  silenceCuts: TimelineCutRange[]
  steps: EditorialCleanupRunStep[]
  createdAt: string
}

/** Detects broad, explicit requests to autonomously clean up the current edit. */
export function isAutonomousEditRequest(prompt: string) {
  const normalized = prompt.trim().toLowerCase()
  return /\b(edit|clean up|tighten|trim)\b[\s\S]*\b(video|footage|timeline|this)\b/.test(normalized)
    || /\b(edit|clean up|tighten|trim)\b\s+(it|this)\b/.test(normalized)
}

/**
 * Creates a reviewable, client-side timeline cleanup run. It intentionally
 * limits mutations to transcript-aligned pauses and never fabricates edits.
 */
export function buildEditorialCleanupRun({
  id,
  prompt,
  transcript,
  recommendations,
  minSilenceDurationSec = 0.4,
}: {
  id: string
  prompt: string
  transcript: TranscriptSegment[] | null | undefined
  recommendations: EditorialRecommendation[]
  minSilenceDurationSec?: number
}): EditorialCleanupRun {
  const segments = transcript ?? []
  if (segments.length < 2) {
    return {
      id,
      prompt,
      status: 'blocked',
      reason: 'Transcript timing is not available yet.',
      silenceCuts: [],
      steps: [{id: 'review-transcript', kind: 'review_transcript', label: 'Review transcript timing', state: 'skipped'}],
      createdAt: new Date().toISOString(),
    }
  }

  const silenceCuts = findTranscriptSilenceCuts(segments, minSilenceDurationSec)
  return {
    id,
    prompt,
    status: 'ready',
    reason: silenceCuts.length > 0 ? null : 'No transcript-aligned pauses meet the cut threshold.',
    silenceCuts,
    steps: [
      {id: 'review-transcript', kind: 'review_transcript', label: 'Review transcript timing', state: 'complete'},
      {
        id: 'cut-silence',
        kind: 'cut_silence',
        label: silenceCuts.length > 0 ? `Apply ${silenceCuts.length} pause cut${silenceCuts.length === 1 ? '' : 's'}` : 'No pause cuts required',
        state: silenceCuts.length > 0 ? 'complete' : 'skipped',
      },
      {
        id: 'review-recommendations',
        kind: 'review_recommendations',
        label: recommendations.length > 0 ? `Stage ${recommendations.length} editorial recommendation${recommendations.length === 1 ? '' : 's'}` : 'No editorial recommendations available',
        state: recommendations.length > 0 ? 'complete' : 'skipped',
      },
    ],
    createdAt: new Date().toISOString(),
  }
}
