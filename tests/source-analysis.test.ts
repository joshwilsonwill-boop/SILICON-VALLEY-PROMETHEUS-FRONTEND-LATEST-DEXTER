import assert from 'node:assert/strict'

import {buildProcessingJobFromSourceAnalysis} from '@/lib/source-analysis'

const response = {
  jobId: 'asset-1',
  sourceAssetId: 'asset-1',
  status: 'completed' as const,
  stage: 'handoff_ready',
  progress: 100,
  snapshot: {
    metadata: {durationMs: 12_000},
    transcript: {
      provider: 'assemblyai',
      mergedWords: [
        {text: 'Build', start_ms: 0, end_ms: 300},
        {text: 'the', start_ms: 320, end_ms: 500},
        {text: 'real', start_ms: 520, end_ms: 760},
        {text: 'thing.', start_ms: 780, end_ms: 1_100},
      ],
    },
    motion: {
      segments: [{startMs: 0, endMs: 4_000, intensity: 0.8}],
    },
    editorialAnalysis: {
      summary: 'Fast delivery with a strong opening.',
      recommendations: [
        {id: 'hook', title: 'Keep the hook', rationale: 'Opening lands.', rangeMs: [0, 1_100]},
      ],
    },
  },
}

const job = buildProcessingJobFromSourceAnalysis({
  projectId: 'project-1',
  response,
  input: {prompt: 'Make a short', sources: ['source.mp4']},
})

assert.equal(job.id, 'asset-1')
assert.equal(job.status, 'completed')
assert.equal(job.transcriptProvider, 'maul')
assert.equal(job.artifacts.transcript[0]?.text, 'Build the real thing.')
assert.deepEqual(job.artifacts.scenes[0], {
  id: 'motion-0',
  startMs: 0,
  endMs: 4_000,
  label: 'High motion',
})
assert.deepEqual(job.artifacts.highlights[0], {
  id: 'hook',
  atMs: 0,
  label: 'Keep the hook',
})
assert.equal(job.transcriptText, 'Build the real thing.')

console.log('source-analysis: all assertions passed')
