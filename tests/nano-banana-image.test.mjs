import assert from 'node:assert/strict'
import test from 'node:test'
import { buildNanoBananaImageRequest, extractGeneratedImage, parseImageDataUrl } from '../lib/thumbnails/nano-banana-image.ts'

const frame = 'data:image/jpeg;base64,YW5jaG9y'
const reference = 'data:image/png;base64,c3R5bGU='

test('generation request includes the video frame and style reference as images', () => {
  const request = buildNanoBananaImageRequest({
    prompt: 'Cinematic portrait with one headline',
    frameDataUrl: frame,
    referenceImages: [reference, 'invalid'],
    aspectRatio: '16:9',
  })

  assert.equal(request.generationConfig.imageConfig.aspectRatio, '16:9')
  assert.deepEqual(request.generationConfig.responseModalities, ['TEXT', 'IMAGE'])
  assert.deepEqual(request.contents[0].parts[2], { inline_data: { mime_type: 'image/jpeg', data: 'YW5jaG9y' } })
  assert.deepEqual(request.contents[0].parts[4], { inline_data: { mime_type: 'image/png', data: 'c3R5bGU=' } })
  assert.equal(request.contents[0].parts.length, 5)
})

test('a frame is required and malformed images are rejected', () => {
  assert.equal(parseImageDataUrl('data:text/plain;base64,YQ=='), null)
  assert.throws(() => buildNanoBananaImageRequest({ prompt: 'test', frameDataUrl: 'invalid', aspectRatio: '1:1' }))
})

test('extracts the generated image from a multimodal response', () => {
  assert.equal(extractGeneratedImage({
    candidates: [{ content: { parts: [{ text: 'Done' }, { inlineData: { mimeType: 'image/png', data: 'Z2VuZXJhdGVk' } }] } }],
  }), 'data:image/png;base64,Z2VuZXJhdGVk')
  assert.equal(extractGeneratedImage({ candidates: [{ content: { parts: [{ text: 'No image' }] } }] }), null)
})
