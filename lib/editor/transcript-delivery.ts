import type { ProcessingJob, TranscriptSegment } from '@/lib/types'

export type PendingTranscript = {
  segments: readonly TranscriptSegment[]
  text: string
}

export function applyTranscriptToProcessingJob(
  job: ProcessingJob,
  segments: readonly TranscriptSegment[],
  transcriptText: string,
): ProcessingJob {
  return {
    ...job,
    artifacts: {
      ...job.artifacts,
      transcript: [...segments],
    },
    transcriptStatus: 'completed',
    transcriptText,
  }
}

export function deliverTranscriptToJob(
  job: ProcessingJob | null,
  segments: readonly TranscriptSegment[],
  transcriptText: string,
): { job: ProcessingJob | null; transcript: PendingTranscript | null } {
  if (!job) {
    return {
      job: null,
      transcript: { segments: [...segments], text: transcriptText },
    }
  }

  return {
    job: applyTranscriptToProcessingJob(job, segments, transcriptText),
    transcript: null,
  }
}
