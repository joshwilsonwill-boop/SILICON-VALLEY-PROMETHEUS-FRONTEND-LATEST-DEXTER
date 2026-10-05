import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const root = process.cwd()
const read = (path) => readFileSync(join(root, path), 'utf8')

const helper = read('lib/server/source-transcript.ts')
const transcriptRoute = read('app/api/assets/[id]/transcript/route.ts')
const editor = read('app/editor/[id]/page.tsx')

assert.match(helper, /force\?: boolean/)
assert.match(transcriptRoute, /searchParams\.get\('restart'\) === '1'/)
assert.match(transcriptRoute, /force: restart/)
assert.match(transcriptRoute, /startedAt: asset\.transcript_started_at/)
assert.match(editor, /TRANSCRIPT_PROVIDER_MAX_WAIT_MS/)
assert.match(editor, /Date\.now\(\) - transcriptStartedAt >= TRANSCRIPT_PROVIDER_MAX_WAIT_MS/)
assert.match(editor, /!Number\.isFinite\(transcriptStartedAt\)/)
assert.match(editor, /stopWithError/)
assert.match(editor, /requestConfirmedTranscription\(sourceAssetId/)
assert.doesNotMatch(editor, /runFallbackTranscription/)

console.log('stalled transcript jobs stop and require a confirmed manual retry')
