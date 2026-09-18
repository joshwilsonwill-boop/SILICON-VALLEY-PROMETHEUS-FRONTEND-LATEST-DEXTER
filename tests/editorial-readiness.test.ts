import assert from 'node:assert/strict'

import {buildEditorialReadiness} from '@/lib/editor/editorial-readiness'

const ready = buildEditorialReadiness({
  analysis: {
    jobId: 'analysis-1',
    sourceAssetId: 'source-1',
    status: 'completed',
    stage: 'handoff_ready',
    progress: 100,
    snapshot: {
      metadata: {durationMs: 12_000},
      motion: {segments: [{startMs: 0, endMs: 4_000, intensity: 0.8}]},
      editorialAnalysis: {
        summary: 'Fast delivery with a strong opening.',
        recommendations: [
          {id: 'hook', title: 'Keep the hook', rationale: 'Opening lands.', rangeMs: [0, 1_100]},
        ],
      },
    },
  },
  transcript: [
    {id: 'one', startMs: 0, endMs: 1_000, text: 'First thought.'},
    {id: 'two', startMs: 1_700, endMs: 2_600, text: 'Second thought.'},
  ],
})

assert.ok(ready)
assert.equal(ready.silenceAssessment, 'suggested')
assert.deepEqual(ready.silenceCuts, [{start: 1, end: 1.7}])
assert.deepEqual(ready.recommendations, [{
  id: 'hook',
  title: 'Keep the hook',
  rationale: 'Opening lands.',
  startSec: 0,
  endSec: 1.1,
}])
assert.equal(ready.motionSegmentCount, 1)

const noPauses = buildEditorialReadiness({
  analysis: {
    jobId: 'analysis-2',
    sourceAssetId: 'source-2',
    status: 'completed',
    stage: 'handoff_ready',
    progress: 100,
    snapshot: {},
  },
  transcript: [
    {id: 'one', startMs: 0, endMs: 1_000, text: 'First thought.'},
    {id: 'two', startMs: 1_200, endMs: 2_000, text: 'Second thought.'},
  ],
})

assert.ok(noPauses)
assert.equal(noPauses.silenceAssessment, 'none')
assert.deepEqual(noPauses.silenceCuts, [])

assert.equal(buildEditorialReadiness({
  analysis: {
    jobId: 'analysis-3',
    sourceAssetId: 'source-3',
    status: 'processing',
    stage: 'transcribing',
    progress: 40,
  },
  transcript: [],
}), null)

console.log('editorial-readiness: all assertions passed')
