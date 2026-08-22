import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'

const route = readFileSync('app/api/projects/[id]/assets/route.ts', 'utf8')

assert.doesNotMatch(route, /dispatchModalSourceAnalysis/)
assert.doesNotMatch(route, /modal-source-analysis/)
assert.match(route, /startSourceAssetTranscription/)
assert.match(route, /transcriptDispatch/)
assert.match(route, /committed\.asset\.id/)
assert.match(route, /startsWith\('video\/'\)/)

console.log('source-analysis-upload-contract: all assertions passed')
