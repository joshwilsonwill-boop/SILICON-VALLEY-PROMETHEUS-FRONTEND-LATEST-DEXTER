import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const helper = readFileSync(new URL('../lib/server/source-transcript.ts', import.meta.url), 'utf8')
const sync = readFileSync(new URL('../app/api/assets/[id]/transcript/sync/route.ts', import.meta.url), 'utf8')
const transcript = readFileSync(new URL('../lib/r2/assembly-transcript.ts', import.meta.url), 'utf8')
const migration = readFileSync(new URL('../supabase/migrations/20260826000000_atomic_source_transcript_claim.sql', import.meta.url), 'utf8')
const editor = readFileSync(new URL('../app/editor/[id]/page.tsx', import.meta.url), 'utf8')

assert.match(helper, /randomUUID\(\)/)
assert.match(helper, /transcript_job_id.*claimToken|claimToken.*transcript_job_id/)
assert.match(helper, /transcript_status.*queued/)
assert.match(migration, /update public\.source_assets/)
assert.match(migration, /transcript_status is null[\s\S]*transcript_status in \('idle', 'failed'/)
assert.match(sync, /assemblyTranscriptToSegments\(assemblyResponse/)
assert.match(sync, /segments\.length === 0/)
assert.match(sync, /transcript_status: 'failed'/)
assert.match(transcript, /return \[\]/)
assert.match(editor, /transcriptStatus=\{job\?\.transcriptStatus \?\? 'idle'\}/)
assert.match(editor, /transcriptSegments=\{job\?\.artifacts\.transcript \?\? \[\]\}/)
assert.match(readFileSync(new URL('../app/api/assets/[id]/transcript/route.ts', import.meta.url), 'utf8'), /segments\.length === 0/)

console.log('source-transcript-atomic-claim: all checks passed.')
