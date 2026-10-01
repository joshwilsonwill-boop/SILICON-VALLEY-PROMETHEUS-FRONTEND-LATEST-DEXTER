import assert from 'node:assert/strict'
import test from 'node:test'
import { readThumbnailGenerationResponse } from '../lib/thumbnails/thumbnail-response.ts'

test('HTML 502 identifies the gateway response and preserves its Vercel request reference', async () => {
  const response = new Response('<html><body>Bad Gateway</body></html>', {
    status: 502,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'x-vercel-id': 'iad1::request-reference',
    },
  })

  await assert.rejects(
    readThumbnailGenerationResponse(response),
    /gateway page instead of image data \(HTTP 502, text\/html\).*does not identify an image API key problem.*Request reference: request iad1::request-reference/s,
  )
})
