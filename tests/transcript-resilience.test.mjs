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

// Failed jobs and transport failures must be visible and recoverable, never an
// infinite loading state. Recovery restarts the durable R2-backed provider job;
// Vercel must never receive the full source video as multipart form data.
assert.match(transcriptRoute, /status: 'failed', error: asset\.transcript_error/)
assert.match(editor, /TRANSCRIPT_SYNC_FAILURES_BEFORE_FALLBACK/)
assert.match(editor, /runFallbackTranscription/)
assert.match(editor, /\/api\/assets\/\$\{sourceAssetId\}\/transcript\?restart=1/)
assert.doesNotMatch(editor, /\/api\/prometheus-chat\/transcribe/)
assert.match(editor, /syncBody\?\.error/)
assert.match(editor, /setTranscriptError/)
assert.match(motion, /transcriptError/)
assert.match(motion, /Transcript paused/)

console.log('transcript resilience checks passed')
