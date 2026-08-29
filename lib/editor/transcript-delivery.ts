import type { ProcessingJob, TranscriptSegment } from '@/lib/types'

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
