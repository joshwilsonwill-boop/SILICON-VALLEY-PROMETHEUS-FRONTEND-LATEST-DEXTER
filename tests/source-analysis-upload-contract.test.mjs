import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'

const route = readFileSync('app/api/projects/[id]/assets/route.ts', 'utf8')

assert.doesNotMatch(route, /startAssemblyAITranscription/)
assert.doesNotMatch(route, /transcript_job_id/)
assert.match(route, /dispatchModalSourceAnalysis/)
assert.match(route, /jobId: committed\.job\.id/)
assert.match(route, /sourceAssetId: committed\.asset\.id/)

console.log('source-analysis-upload-contract: all assertions passed')
