import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { requestConfirmedTranscription } from '../lib/editor/request-transcription.ts'
import { parseComputeConfirmation } from '../lib/compute/policy.ts'

const quote = { operation: 'transcribe', cost: 1, balance: 3, canAfford: true }
const requestId = 'c07c3a4d-a8eb-41d3-856d-91c0dcb489a8'

function response(status, body) {
  return { ok: status >= 200 && status < 300, json: async () => body }
}

const requests = []
const result = await requestConfirmedTranscription('source-1', {
  restart: true,
  fetcher: async (url, options) => {
    requests.push({ url, options })
    return requests.length === 1 ? response(200, quote) : response(200, { status: 'queued' })
  },
  confirm: message => {
    assert.match(message, /1 credit/)
    assert.match(message, /3 credits/)
    return true
  },
  newRequestId: () => requestId,
})
assert.equal(result, true)
assert.equal(requests[0].url, '/api/exports/quote?operation=transcribe')
assert.equal(requests[1].url, '/api/assets/source-1/transcript?restart=1')
assert.deepEqual(JSON.parse(requests[1].options.body), { confirmed: true, requestId })
assert.deepEqual(parseComputeConfirmation(JSON.parse(requests[1].options.body)), { confirmed: true, requestId })
const editor = readFileSync('app/editor/[id]/page.tsx', 'utf8')
assert.match(editor, /requestConfirmedTranscription\(sourceAssetId/)
assert.doesNotMatch(editor, /if \(body\?\.status === 'idle'\) \{\s*await requestAssemblyAITranscription/)

for (const [name, quoteResponse, confirm, expectedError] of [
  ['cancelled', quote, () => false, null],
  ['insufficient', { ...quote, balance: 0, canAfford: false }, () => { throw new Error('Confirmation must not open') }, /Insufficient credits/],
]) {
  const calls = []
  const work = requestConfirmedTranscription('source-1', {
    fetcher: async url => { calls.push(url); return response(200, quoteResponse) },
    confirm,
    newRequestId: () => requestId,
  })
  if (expectedError) await assert.rejects(work, expectedError, name)
  else assert.equal(await work, false, name)
  assert.deepEqual(calls, ['/api/exports/quote?operation=transcribe'], name)
}

const failedQuoteCalls = []
await assert.rejects(requestConfirmedTranscription('source-1', {
  fetcher: async url => { failedQuoteCalls.push(url); return response(503, { error: 'Credit service is unavailable.' }) },
  confirm: () => { throw new Error('Confirmation must not open') },
  newRequestId: () => requestId,
}), /Credit service is unavailable/)
assert.deepEqual(failedQuoteCalls, ['/api/exports/quote?operation=transcribe'])

console.log('transcription credit confirmation: all checks passed')
