import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const root = process.cwd()
const read = (path) => readFileSync(join(root, path), 'utf8')

const transcriptRoute = read('app/api/assets/[id]/transcript/route.ts')
const editor = read('app/editor/[id]/page.tsx')
const motion = read('components/editor/motion-edit-workspace.tsx')

// Persisting fallback segments must terminate the durable job. Otherwise GET
// sees the old queued state first and hides a perfectly valid transcript.
assert.match(transcriptRoute, /transcript_status: 'completed'/)
assert.match(transcriptRoute, /transcript_completed_at: new Date\(\)\.toISOString\(\)/)

// Failed jobs and transport failures must be visible. A retry needs another
// credit review, so polling must never dispatch a paid transcription itself.
assert.match(transcriptRoute, /status: 'failed',[\s\S]*?error: asset\.transcript_error/)
assert.match(editor, /TRANSCRIPT_SYNC_FAILURES_BEFORE_ERROR/)
assert.match(editor, /stopWithError/)
assert.match(editor, /requestConfirmedTranscription\(sourceAssetId/)
assert.doesNotMatch(editor, /runFallbackTranscription/)
assert.doesNotMatch(editor, /requestAssemblyAITranscription\(false/)
assert.doesNotMatch(editor, /\/api\/prometheus-chat\/transcribe/)
assert.match(editor, /syncBody\?\.error/)
assert.match(editor, /setTranscriptError/)
assert.match(motion, /transcriptError/)
assert.match(motion, /Transcript paused/)

console.log('transcript resilience checks passed')
