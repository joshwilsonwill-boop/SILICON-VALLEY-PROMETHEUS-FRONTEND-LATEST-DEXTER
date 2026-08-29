import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildTranscriptResultMetadata,
  buildTranscriptSourceProfile,
} from '@/lib/server/transcript-persistence'
import { applyTranscriptToProcessingJob } from '@/lib/editor/transcript-delivery'
import type { ProcessingJob } from '@/lib/types'
import { normalizeSourceProfile } from '@/lib/media/source-profile'

const segments = [
  { id: 'segment-1', startMs: 120, endMs: 980, text: 'Ship the real fix.', speaker: 'A' },
]

test('transcript result metadata preserves existing artifacts and stores the editor contract', () => {
  const existing = {
    input: { prompt: 'make it concise' },
    stage: 'analyzing',
    artifacts: { animationPlan: { id: 'plan-1' }, scenes: [{ id: 'scene-1' }] },
  }

  assert.deepEqual(buildTranscriptResultMetadata(existing, segments, 'Ship the real fix.'), {
    input: { prompt: 'make it concise' },
    stage: 'analyzing',
    transcriptStatus: 'completed',
    transcriptText: 'Ship the real fix.',
    artifacts: {
      animationPlan: { id: 'plan-1' },
      scenes: [{ id: 'scene-1' }],
      transcript: segments,
    },
  })
  assert.deepEqual(existing, {
    input: { prompt: 'make it concise' },
    stage: 'analyzing',
    artifacts: { animationPlan: { id: 'plan-1' }, scenes: [{ id: 'scene-1' }] },
  })
})

test('transcript source profile preserves inspection metadata', () => {
  const existing = {
    inspection: { durationSec: 12.4, width: 1920, height: 1080 },
    warnings: ['extended runtime detected'],
  }

  assert.deepEqual(buildTranscriptSourceProfile(existing, segments), {
    inspection: { durationSec: 12.4, width: 1920, height: 1080 },
    warnings: ['extended runtime detected'],
    transcript: segments,
  })
})

test('completed transcript hydrates a processing job without dropping unrelated fields', () => {
  const job: ProcessingJob = {
    id: 'job-1',
    projectId: 'project-1',
    status: 'running',
    createdAt: '2026-08-29T00:00:00.000Z',
    startedAt: '2026-08-29T00:00:00.000Z',
    steps: [],
    input: { prompt: '', sources: [] },
    artifacts: {
      scenes: [{ id: 'scene-1', startMs: 0, endMs: 1_000, label: 'Opening' }],
      transcript: [],
      highlights: [],
      brollSuggestions: [],
    },
    transcriptStatus: 'transcribing',
    transcriptText: undefined,
  }

  assert.deepEqual(applyTranscriptToProcessingJob(job, segments, 'Ship the real fix.'), {
    id: 'job-1',
    projectId: 'project-1',
    status: 'running',
    createdAt: '2026-08-29T00:00:00.000Z',
    startedAt: '2026-08-29T00:00:00.000Z',
    steps: [],
    input: { prompt: '', sources: [] },
    artifacts: {
      scenes: [{ id: 'scene-1', startMs: 0, endMs: 1_000, label: 'Opening' }],
      transcript: segments,
      highlights: [],
      brollSuggestions: [],
    },
    transcriptStatus: 'completed',
    transcriptText: 'Ship the real fix.',
  })
})

test('null metadata inputs still produce a complete editor contract', () => {
  assert.deepEqual(buildTranscriptResultMetadata(null, segments, 'Ship the real fix.'), {
    transcriptStatus: 'completed',
    transcriptText: 'Ship the real fix.',
    artifacts: { transcript: segments },
  })
  assert.deepEqual(buildTranscriptSourceProfile(null, segments), { transcript: segments })
})

test('project profile normalization keeps the persisted transcript for the editor', () => {
  const profile = normalizeSourceProfile({
    inspection: {
      mediaKind: 'video',
      mimeType: 'video/mp4',
      fileName: 'source.mp4',
      fileSizeBytes: 10,
      width: 1920,
      height: 1080,
      aspectRatio: 16 / 9,
      durationSec: 12.4,
      fps: 30,
      hasAudio: true,
      orientation: 'landscape',
      estimatedBitrateMbps: 1,
    },
    transcript: segments,
  })

  assert.deepEqual(profile?.transcript, segments)
})
