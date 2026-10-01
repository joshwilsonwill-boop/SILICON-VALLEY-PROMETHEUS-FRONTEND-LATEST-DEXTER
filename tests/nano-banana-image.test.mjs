import assert from 'node:assert/strict'
import test from 'node:test'
import { buildNanoBananaImageRequest, extractGeneratedImage, parseImageDataUrl } from '../lib/thumbnails/nano-banana-image.ts'
import { buildOpenAIImageEditRequest, DEFAULT_THUMBNAIL_IMAGE_MODEL, extractOpenAIImageEditResult, resolveOpenAIImageEditEndpoint } from '../lib/thumbnails/openai-image-edit.ts'

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

test('builds a frame-anchored OpenAI-compatible edit request with aspect-specific sizing', () => {
  const request = buildOpenAIImageEditRequest({
    prompt: 'A cinematic thumbnail with an exact headline',
    frameDataUrl: frame,
    referenceImages: [reference, 'invalid'],
    aspectRatio: '16:9',
    quality: 'pro',
  })

  assert.equal(request.model, DEFAULT_THUMBNAIL_IMAGE_MODEL)
  assert.equal(request.size, '1536x864')
  assert.equal(request.quality, 'high')
  assert.equal(request.output_format, 'png')
  assert.equal(request.input_fidelity, 'high')
  assert.deepEqual(request.images, [{ image_url: frame }, { image_url: reference }])
  assert.match(request.prompt, /first attached image as the video subject anchor/)
})

test('rejects a missing edit frame and resolves a CE image edit endpoint', () => {
  assert.throws(() => buildOpenAIImageEditRequest({ prompt: 'test', frameDataUrl: 'invalid', aspectRatio: '1:1', quality: 'fast' }))
  assert.equal(resolveOpenAIImageEditEndpoint(), 'https://codex-everywhere.com/v1/images/edits')
  assert.equal(resolveOpenAIImageEditEndpoint('https://images.example.test/v1'), 'https://images.example.test/v1/images/edits')
  assert.equal(resolveOpenAIImageEditEndpoint('https://images.example.test/v1/images/edits'), 'https://images.example.test/v1/images/edits')
  assert.throws(() => resolveOpenAIImageEditEndpoint('http://images.example.test/v1'))
})

test('extracts base64 image output from an OpenAI-compatible response', () => {
  assert.equal(extractOpenAIImageEditResult({ data: [{ b64_json: 'Z2VuZXJhdGVk' }] }), 'data:image/png;base64,Z2VuZXJhdGVk')
  assert.equal(extractOpenAIImageEditResult({ data: [{ b64_json: 'not base64!' }] }), null)
  assert.equal(extractOpenAIImageEditResult({ data: [] }), null)
})
