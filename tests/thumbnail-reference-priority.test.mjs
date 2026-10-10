import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

import { resolveThumbnailBaseUrl } from '../lib/thumbnails/thumbnail-request.ts'
import { buildNanoBananaImageRequest } from '../lib/thumbnails/nano-banana-image.ts'
import { buildOpenAIImageEditFormData, buildOpenAIImageEditRequest } from '../lib/thumbnails/openai-image-edit.ts'
import { THUMBNAIL_PROMPT_PLANNER_INSTRUCTIONS } from '../lib/thumbnails/retention-prompt.ts'

const frame = 'data:image/jpeg;base64,ZmFtZQ=='
const selectedReference = 'data:image/webp;base64,c2VsZWN0ZWQ='
const extraReference = 'data:image/png;base64,YWRkaXRpb25hbA=='
const oldArtwork = 'data:image/png;base64,b2xk'

test('ordinary generations start from the selected frame, while explicit iterations keep a base', () => {
  assert.equal(resolveThumbnailBaseUrl({ generatedDataUrl: oldArtwork }), undefined)
  assert.equal(resolveThumbnailBaseUrl({ isIterative: false, generatedDataUrl: oldArtwork }), undefined)
  assert.equal(resolveThumbnailBaseUrl({ isIterative: true, generatedDataUrl: oldArtwork }), oldArtwork)
  assert.equal(resolveThumbnailBaseUrl({ jarvisDraftIsIterative: true, draftBaseThumbnailUrl: oldArtwork }), oldArtwork)
  assert.equal(resolveThumbnailBaseUrl({ iterationPrompt: 'Move the title left', draftBaseThumbnailUrl: oldArtwork }), oldArtwork)
})

test('the studio modal uses the base resolver for its generation requests', async () => {
  const source = await readFile(new URL('../components/editor/ThumbnailStudioModal.tsx', import.meta.url), 'utf8')
  assert.match(source, /resolveThumbnailBaseUrl\(\{/)
  assert.match(source, /draftBaseThumbnailUrl: jarvisDraft\?\.baseThumbnailUrl/)
})
test('Gemini requests identify the selected reference as primary and label extra references as secondary', () => {
  const request = buildNanoBananaImageRequest({
    prompt: 'Studio art direction with selected library reference: bright graph paper and a surreal brain.',
    frameDataUrl: frame,
    referenceImages: [selectedReference, extraReference],
    aspectRatio: '16:9',
  })
  const parts = request.contents[0].parts
  assert.match(parts[0].text, /second attached image is the selected primary thumbnail style reference/i)
  assert.ok(parts.some(part => part.text?.includes('Selected primary thumbnail style reference')))
  assert.ok(parts.some(part => part.text?.includes('Additional secondary style reference')))
  assert.deepEqual(parts.find(part => 'inline_data' in part && part.inline_data.data === 'c2VsZWN0ZWQ=')?.inline_data, { mime_type: 'image/webp', data: 'c2VsZWN0ZWQ=' })
})

test('OpenAI-compatible requests identify primary and secondary references in prompt and multipart files', () => {
  const input = {
    prompt: 'Studio art direction with selected library reference: bright graph paper and a surreal brain.',
    frameDataUrl: frame,
    referenceImages: [selectedReference, extraReference],
    aspectRatio: '16:9',
    quality: 'fast',
  }
  const request = buildOpenAIImageEditRequest(input)
  assert.match(request.prompt, /second attached image is the selected primary thumbnail style reference/i)
  assert.match(request.prompt, /later reference images are secondary style cues/i)

  const form = buildOpenAIImageEditFormData(input)
  const uploads = form.getAll('image[]')
  assert.deepEqual(uploads.map(image => image.name), ['video-frame.jpg', 'selected-primary-reference.webp', 'additional-style-reference-1.png'])
})

test('the planner transfers the reference composition while adapting the new subject and headline', () => {
  assert.match(THUMBNAIL_PROMPT_PLANNER_INSTRUCTIONS, /visual language and close macro-composition/i)
  assert.match(THUMBNAIL_PROMPT_PLANNER_INSTRUCTIONS, /do not copy reference subjects, logos, or exact words/i)
  assert.doesNotMatch(THUMBNAIL_PROMPT_PLANNER_INSTRUCTIONS, /not their exact layout/i)
})
