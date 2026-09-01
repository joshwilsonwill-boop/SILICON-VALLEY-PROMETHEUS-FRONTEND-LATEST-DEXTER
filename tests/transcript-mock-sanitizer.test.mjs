import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import {
  buildMotionTranscriptSegments,
  isLegacyMockTranscriptText,
  LEGACY_MOCK_TRANSCRIPT_SNIPPETS,
} from '../lib/editor/motion-transcript.ts'

// 1. Detect all known legacy mock strings
for (const snippet of LEGACY_MOCK_TRANSCRIPT_SNIPPETS) {
  assert.equal(isLegacyMockTranscriptText(snippet), true, `Must detect: ${snippet}`)
  assert.equal(isLegacyMockTranscriptText(snippet.toUpperCase()), true, `Must detect uppercase: ${snippet}`)
  assert.equal(isLegacyMockTranscriptText(`   ${snippet}   `), true, `Must detect padded: ${snippet}`)
}

// 2. Do not false-positive on real user speech
assert.equal(isLegacyMockTranscriptText('Hello world and welcome to this video tutorial.'), false)
assert.equal(isLegacyMockTranscriptText('Dan Martell explains SaaS scaling metrics.'), false)

// 3. buildMotionTranscriptSegments filters out mock items
const mockSegments = [
  { id: 'ts-0', startMs: 0, endMs: 7500, text: "It doesn't matter if you are in your first job." },
  { id: 'ts-1', startMs: 9000, endMs: 16500, text: 'Structure over surface is what makes the message stick.' },
  { id: 'ts-2', startMs: 18000, endMs: 25500, text: 'Retrieval is the skill people actually remember.' },
]
const filtered = buildMotionTranscriptSegments(mockSegments)
assert.equal(filtered.length, 0, 'All legacy mock segments must be discarded')

// 4. Real segments remain untouched
const realSegments = [
  { id: 'real-1', startMs: 0, endMs: 4000, text: 'This is genuine spoken audio from the video.' },
]
const realResult = buildMotionTranscriptSegments(realSegments)
assert.equal(realResult.length, 1)
assert.equal(realResult[0].text, 'This is genuine spoken audio from the video.')

// 5. Editor sync contract verification
const editorPage = readFileSync(join(process.cwd(), 'app/editor/[id]/page.tsx'), 'utf8')
assert.match(editorPage, /isLegacyMockTranscriptText/)
assert.match(editorPage, /nextJob\.artifacts\.transcript = \[\]/)

// 6. Motion workspace empty-state contract verification
const workspace = readFileSync(join(process.cwd(), 'components/editor/motion-edit-workspace.tsx'), 'utf8')
assert.match(workspace, /No transcript generated yet/)
assert.match(workspace, /Transcribe video/)

console.log('transcript-mock-sanitizer: all checks passed.')
