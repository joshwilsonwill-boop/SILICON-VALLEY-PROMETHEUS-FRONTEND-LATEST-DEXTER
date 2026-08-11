import assert from 'node:assert/strict'

import {dispatchModalSourceAnalysis} from '@/lib/server/modal-source-analysis'

async function main() {
let capturedUrl = ''
let capturedInit: RequestInit | undefined
const result = await dispatchModalSourceAnalysis({
  request: {
    jobId: '123e4567-e89b-12d3-a456-426614174100',
    sourceAssetId: '123e4567-e89b-12d3-a456-426614174100',
  },
  env: {
    PROMETHEUS_BACKEND_URL: 'https://joshuagreat965--api.modal.run',
    MODAL_PROXY_KEY: 'server-key',
    MODAL_PROXY_SECRET: 'server-secret',
  },
  fetchImpl: async (input, init) => {
    capturedUrl = String(input)
    capturedInit = init
    return Response.json({callId: 'fc-source-1', status: 'queued'}, {status: 202})
  },
})

assert.deepEqual(result, {callId: 'fc-source-1', status: 'queued'})
assert.equal(capturedUrl, 'https://joshuagreat965--api.modal.run/api/source-analysis/jobs')
assert.equal(capturedInit?.method, 'POST')
assert.equal(new Headers(capturedInit?.headers).get('Modal-Key'), 'server-key')
assert.equal(new Headers(capturedInit?.headers).get('Modal-Secret'), 'server-secret')
assert.deepEqual(JSON.parse(String(capturedInit?.body)), {
  jobId: '123e4567-e89b-12d3-a456-426614174100',
  sourceAssetId: '123e4567-e89b-12d3-a456-426614174100',
})

console.log('source-analysis-dispatch: all assertions passed')
}

void main()
