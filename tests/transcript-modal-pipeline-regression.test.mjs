import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const root = process.cwd()
const read = (relativePath) => readFileSync(join(root, relativePath), 'utf8')

const transcriptRoute = read('app/api/assets/[id]/transcript/route.ts')
assert.match(transcriptRoute, /export async function GET/)
assert.match(transcriptRoute, /export async function POST/)
assert.match(transcriptRoute, /assemblyTranscriptToSegments/)
assert.match(transcriptRoute, /startSourceAssetTranscription/)
assert.match(transcriptRoute, /status: 'transcribing'/)

const syncRoute = read('app/api/assets/[id]/transcript/sync/route.ts')
assert.match(syncRoute, /getAssemblyAITranscriptionStatus/)
assert.match(syncRoute, /uploadTranscriptToR2/)

const helper = read('lib/server/source-transcript.ts')
assert.match(helper, /MAX_AUTO_TRANSCRIPT_DURATION_MS = 40 \* 60 \* 1000/)
assert.match(helper, /startsWith\('video\/'\)/)
assert.match(helper, /startAssemblyAITranscription/)
assert.match(helper, /transcript_job_id/)
assert.match(helper, /transcript_status: 'queued'/)

const normalizer = read('lib/r2/assembly-transcript.ts')
assert.match(normalizer, /assemblyTranscriptWords/)
assert.match(normalizer, /assemblyTranscriptToSegments/)
assert.match(normalizer, /group.length >= 12/)

const assetsRoute = read('app/api/projects/[id]/assets/route.ts')
assert.match(assetsRoute, /startSourceAssetTranscription/)
assert.match(assetsRoute, /transcriptDispatch/)

const editorPage = read('app/editor/[id]/page.tsx')
assert.match(editorPage, /api\/assets\/\$\{project!\.sourceAssetId\}\/transcript/)
assert.match(editorPage, /transcriptStatus: 'completed'/)
assert.match(editorPage, /TranscriptSegment/)

const proxy = read('lib/server/modal-backend-proxy.ts')
assert.match(proxy, /AbortSignal\.timeout/)
assert.match(proxy, /MODAL_PROXY_TIMEOUT_MS/)

const modalCore = read('lib/api/modal-core.ts')
assert.match(modalCore, /AbortSignal\.timeout/)
assert.match(modalCore, /DEFAULT_CLIENT_TIMEOUT_MS/)

const streamRoute = read('app/api/prometheus-chat/stream/route.ts')
assert.match(streamRoute, /sessionId: context\.sessionId/)
assert.match(streamRoute, /sessionId, reply, clientMessageId, streamJobs/)
assert.match(streamRoute, /jobs && jobs\.length/)

console.log('transcript + modal-safe-call pipeline checks passed')
