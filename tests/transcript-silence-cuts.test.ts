import assert from 'node:assert/strict'

import { findTranscriptSilenceCuts } from '@/lib/editor/silence-cuts'

const cuts = findTranscriptSilenceCuts([
  {
    id: 'one',
    startMs: 0,
    endMs: 1_100,
    text: 'First thought',
    words: [
      { text: 'First', startMs: 0, endMs: 400 },
      { text: 'thought', startMs: 650, endMs: 1_100 },
    ],
  },
  { id: 'two', startMs: 1_850, endMs: 2_500, text: 'Second thought' },
  { id: 'cut', startMs: 3_000, endMs: 3_400, text: 'Already removed', isCut: true },
  { id: 'three', startMs: 4_100, endMs: 4_600, text: 'Third thought' },
], 0.5)

assert.deepEqual(cuts, [
  { start: 1.1, end: 1.85 },
  { start: 2.5, end: 4.1 },
])
assert.deepEqual(findTranscriptSilenceCuts([], 0.4), [])
assert.deepEqual(findTranscriptSilenceCuts([
  { id: 'a', startMs: 0, endMs: 1_000, text: 'A' },
  { id: 'b', startMs: 1_200, endMs: 2_000, text: 'B' },
], 0.4), [])

console.log('transcript-silence-cuts tests passed')
