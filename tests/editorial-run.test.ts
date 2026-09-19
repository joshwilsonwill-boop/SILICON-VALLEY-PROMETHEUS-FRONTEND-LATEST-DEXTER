import assert from 'node:assert/strict'

import {buildEditorialCleanupRun, isAutonomousEditRequest} from '@/lib/editor/editorial-run'

const actionable = buildEditorialCleanupRun({
  id: 'run-1',
  prompt: 'Edit this video and keep it tight.',
  transcript: [
    {id: 'one', startMs: 0, endMs: 1_000, text: 'First thought.'},
    {id: 'two', startMs: 1_800, endMs: 2_600, text: 'Second thought.'},
  ],
  recommendations: [{id: 'hook', title: 'Keep the opening hook', rationale: 'The opening lands.', startSec: 0, endSec: 1}],
})

assert.equal(actionable.status, 'ready')
assert.deepEqual(actionable.silenceCuts, [{start: 1, end: 1.8}])
assert.deepEqual(actionable.steps.map((step) => step.kind), ['review_transcript', 'cut_silence', 'review_recommendations'])
assert.equal(isAutonomousEditRequest('Could you edit this video?'), true)

const blocked = buildEditorialCleanupRun({
  id: 'run-2',
  prompt: 'Edit this video.',
  transcript: [],
  recommendations: [],
})

assert.equal(blocked.status, 'blocked')
assert.equal(blocked.reason, 'Transcript timing is not available yet.')
console.log('editorial-run: all assertions passed')
