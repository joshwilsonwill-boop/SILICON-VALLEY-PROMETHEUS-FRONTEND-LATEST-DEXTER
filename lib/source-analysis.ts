import type {
  DetectedScene,
  HighlightTimestamp,
  ProcessingJob,
  ProcessingJobInput,
  TranscriptSegment,
} from '@/lib/types'

type JsonObject = Record<string, unknown>

export type SourceAnalysisResponse = {
  jobId: string
  sourceAssetId: string
  status: 'pending' | 'queued' | 'leased' | 'processing' | 'completed' | 'failed' | 'superseded' | 'cancelled'
  stage: string
  progress: number
  error?: string | null
  snapshot?: JsonObject | null
}

const object = (value: unknown): JsonObject =>
  value && typeof value === 'object' && !Array.isArray(value) ? value as JsonObject : {}

const number = (value: unknown, fallback = 0) =>
  Number.isFinite(Number(value)) ? Number(value) : fallback

const text = (value: unknown) => typeof value === 'string' ? value.trim() : ''

type TimedWord = {text: string; startMs: number; endMs: number}

function timedWords(snapshot: JsonObject): TimedWord[] {
  const transcript = object(snapshot.transcript)
  const words = Array.isArray(transcript.mergedWords) ? transcript.mergedWords : []
  return words.flatMap((entry) => {
    const word = object(entry)
    const value = text(word.text)
    if (!value) return []
    const startMs = number(word.start_ms ?? word.startMs)
    return [{text: value, startMs, endMs: Math.max(startMs, number(word.end_ms ?? word.endMs, startMs))}]
  })
}

function transcriptSegments(words: TimedWord[]): TranscriptSegment[] {
  const segments: TranscriptSegment[] = []
  let group: TimedWord[] = []
  const flush = () => {
    if (!group.length) return
    const index = segments.length
    segments.push({
      id: `transcript-${index}`,
      startMs: group[0]!.startMs,
      endMs: group.at(-1)!.endMs,
      text: group.map((word) => word.text).join(' '),
    })
    group = []
  }
  for (const word of words) {
    const previous = group.at(-1)
    if (previous && (word.startMs - previous.endMs > 800 || group.length >= 12)) flush()
    group.push(word)
    if (/[.!?]$/.test(word.text)) flush()
  }
  flush()
  return segments
}

function motionScenes(snapshot: JsonObject): DetectedScene[] {
  const motion = object(snapshot.motion)
  const segments = Array.isArray(motion.segments) ? motion.segments : []
  return segments.map((entry, index) => {
    const segment = object(entry)
    const intensity = Math.max(0, Math.min(1, number(segment.intensity)))
    return {
      id: `motion-${index}`,
      startMs: number(segment.startMs ?? segment.start_ms),
      endMs: number(segment.endMs ?? segment.end_ms),
      label: `${intensity >= 0.67 ? 'High' : intensity >= 0.34 ? 'Medium' : 'Low'} motion`,
    }
  })
}

function recommendationHighlights(snapshot: JsonObject): HighlightTimestamp[] {
  const analysis = object(snapshot.editorialAnalysis ?? snapshot.editorial_analysis)
  const recommendations = Array.isArray(analysis.recommendations) ? analysis.recommendations : []
  return recommendations.flatMap((entry, index) => {
    const recommendation = object(entry)
    const range = Array.isArray(recommendation.rangeMs) ? recommendation.rangeMs : []
    if (!Number.isFinite(Number(range[0]))) return []
    return [{
      id: text(recommendation.id) || `recommendation-${index}`,
      atMs: number(range[0]),
      label: text(recommendation.title) || 'Editorial recommendation',
    }]
  })
}

export function buildProcessingJobFromSourceAnalysis({
  projectId,
  response,
  input,
}: {
  projectId: string
  response: SourceAnalysisResponse
  input: ProcessingJobInput
}): ProcessingJob {
  const snapshot = object(response.snapshot)
  const words = timedWords(snapshot)
  const transcript = transcriptSegments(words)
  const completed = response.status === 'completed'
  const failed = ['failed', 'superseded', 'cancelled'].includes(response.status)
  const progress = Math.max(0, Math.min(100, response.progress)) / 100
  const stepStatus = completed ? 'completed' : failed ? 'error' : 'running'
  const now = new Date().toISOString()
  return {
    id: response.jobId,
    projectId,
    status: completed ? 'completed' : failed ? 'failed' : 'running',
    createdAt: now,
    startedAt: now,
    input,
    steps: [
      {key: 'video-analysis', title: 'Video Analysis', status: stepStatus, progress},
      {key: 'audio-processing', title: 'Audio Processing', status: stepStatus, progress},
      {key: 'scene-detection', title: 'Scene Detection', status: stepStatus, progress},
      {key: 'ai-enhancement', title: 'AI Enhancement', status: stepStatus, progress},
    ],
    artifacts: {
      transcript,
      scenes: motionScenes(snapshot),
      highlights: recommendationHighlights(snapshot),
      brollSuggestions: [],
      styleId: input.styleId,
    },
    transcriptStatus: completed ? 'completed' : failed ? 'failed' : 'transcribing',
    transcriptText: transcript.map((segment) => segment.text).join(' '),
    transcriptProvider: 'maul',
  }
}
