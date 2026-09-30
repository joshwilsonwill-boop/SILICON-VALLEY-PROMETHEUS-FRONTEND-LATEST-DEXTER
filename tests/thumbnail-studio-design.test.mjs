import assert from 'node:assert/strict'
import test from 'node:test'
import { DEFAULT_STUDIO_DESIGN, STUDIO_BACKGROUNDS, parseStudioDesign, buildStudioArtDirection, resolveStudioImageModel } from '../lib/thumbnails/studio-art-direction.ts'
import { buildNanoBananaImageRequest, extractGeneratedImage } from '../lib/thumbnails/nano-banana-image.ts'
import { readThumbnailGenerationResponse } from '../lib/thumbnails/thumbnail-response.ts'

test('every supported background produces explicit reference-led art direction', () => {
  const directions = new Set()
  for (const background of STUDIO_BACKGROUNDS) {
    const design = parseStudioDesign({ ...DEFAULT_STUDIO_DESIGN, background: background.id })
    const prompt = buildStudioArtDirection(design, 'Coaching mastery secrets', 'mastery')
    assert.ok(prompt.includes('selected visual reference as the primary composition'))
    assert.ok(prompt.includes(background.prompt))
    assert.ok(prompt.includes('#00B9F2'))
    assert.ok(prompt.includes('"Coaching mastery secrets"'))
    assert.ok(prompt.includes('"mastery"'))
    assert.ok(prompt.includes('320 pixels'))
    assert.ok(prompt.includes('6% safe margin'))
    directions.add(prompt)
  }
  assert.equal(directions.size, STUDIO_BACKGROUNDS.length)
})

test('invalid design controls fail before a generation request can be assembled', () => {
  assert.deepEqual(parseStudioDesign(DEFAULT_STUDIO_DESIGN), DEFAULT_STUDIO_DESIGN)
  for (const invalid of [null, [], {}, { ...DEFAULT_STUDIO_DESIGN, layout: 'invented' }, { ...DEFAULT_STUDIO_DESIGN, background: 'invented' }, { ...DEFAULT_STUDIO_DESIGN, accent: 'red' }, { ...DEFAULT_STUDIO_DESIGN, quality: 'untrusted-model' }, { ...DEFAULT_STUDIO_DESIGN, textScale: NaN }, { ...DEFAULT_STUDIO_DESIGN, textScale: 0.6 }, { ...DEFAULT_STUDIO_DESIGN, textScale: 1.4 }]) assert.throws(() => parseStudioDesign(invalid))
})

test('quality resolves to a fixed supported model and requests high resolution', () => {
  assert.equal(resolveStudioImageModel('fast'), 'gemini-3.1-flash-image')
  assert.equal(resolveStudioImageModel('pro'), 'gemini-3-pro-image')
  for (const aspectRatio of ['16:9','3:2','1:1','9:16','2:3']) {
    const request = buildNanoBananaImageRequest({ prompt: 'Exact headline', frameDataUrl: 'data:image/png;base64,YQ==', aspectRatio, imageSize: '2K' })
    assert.deepEqual(request.generationConfig.imageConfig, { aspectRatio, imageSize: '2K' })
    assert.equal(request.contents[0].parts[2].inline_data.data, 'YQ==')
  }
})

test('legacy requests preserve their original image configuration', () => {
  const request = buildNanoBananaImageRequest({ prompt: 'test', frameDataUrl: 'data:image/png;base64,YQ==', aspectRatio: '16:9' })
  assert.deepEqual(request.generationConfig.imageConfig, { aspectRatio: '16:9' })
})

test('thinking images are skipped and only finished artwork is exported', () => {
  const response = { candidates: [{ content: { parts: [{ thought: true, inlineData: { mimeType: 'image/png', data: 'dGhvdWdodA==' } }, { inlineData: { mimeType: 'image/png', data: 'ZmluYWw=' } }] } }] }
  assert.equal(extractGeneratedImage(response), 'data:image/png;base64,ZmluYWw=')
  assert.equal(extractGeneratedImage({ candidates: [{ content: { parts: [response.candidates[0].content.parts[0]] } }] }), null)
})

test('HTML gateway pages produce a recoverable message and valid JSON artwork survives parsing', async () => {
  await assert.rejects(readThumbnailGenerationResponse(new Response('<!DOCTYPE html><title>Gateway</title>', { status: 502, headers: { 'Content-Type': 'text/html' } })), /HTTP 502, text\/html.*does not identify a Gemini key error/)
  await assert.rejects(readThumbnailGenerationResponse(new Response('<!DOCTYPE html><title>Payload too large</title>', { status: 413, headers: { 'Content-Type': 'text/html' } })), /request as too large \(HTTP 413\)/)
  assert.deepEqual(await readThumbnailGenerationResponse(Response.json({ dataUrl: 'data:image/png;base64,YQ==' })), { dataUrl: 'data:image/png;base64,YQ==' })
})

test('user headline, color, and no-emphasis choices stay authoritative', () => {
  const prompt = buildStudioArtDirection({ ...DEFAULT_STUDIO_DESIGN, layout: 'clean', accent: '#ff6259', textScale: 1.25 }, '  My actual story  ', '')
  assert.ok(prompt.includes('"My actual story"'))
  assert.ok(prompt.includes('#ff6259'))
  assert.ok(prompt.includes('125%'))
  assert.ok(prompt.includes('without choosing an arbitrary highlighted word'))
  assert.ok(prompt.includes('selected visual reference as the primary composition'))
  assert.ok(prompt.includes('Never add a sample slogan'))
  assert.ok(buildStudioArtDirection(DEFAULT_STUDIO_DESIGN, 'My hook', '', 'warm film portrait with hand-drawn notes').includes('warm film portrait with hand-drawn notes'))
})
