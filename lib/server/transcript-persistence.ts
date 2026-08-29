import type { TranscriptSegment } from '@/lib/types'

type JsonRecord = Record<string, unknown>

function asRecord(value: unknown): JsonRecord {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as JsonRecord
    : {}
}

export function buildTranscriptResultMetadata(
  currentMetadata: unknown,
  segments: readonly TranscriptSegment[],
  transcriptText: string,
): JsonRecord {
  const metadata = asRecord(currentMetadata)
  const artifacts = asRecord(metadata.artifacts)

  return {
    ...metadata,
    transcriptStatus: 'completed',
    transcriptText,
    artifacts: {
      ...artifacts,
      transcript: segments,
    },
  }
}

export function buildTranscriptSourceProfile(
  currentProfile: unknown,
  segments: readonly TranscriptSegment[],
): JsonRecord {
  return {
    ...asRecord(currentProfile),
    transcript: segments,
  }
}
