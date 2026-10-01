import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { DEFAULT_STUDIO_DESIGN, STUDIO_BACKGROUNDS, parseStudioDesign, buildStudioArtDirection, resolveStudioImageModel, resolveStudioImageSize } from '../lib/thumbnails/studio-art-direction.ts'
import { buildNanoBananaImageRequest, extractGeneratedImage } from '../lib/thumbnails/nano-banana-image.ts'
import { readThumbnailGenerationResponse } from '../lib/thumbnails/thumbnail-response.ts'
import { compactGeneratedThumbnail, MAX_THUMBNAIL_DATA_URL_BYTES } from '../lib/thumbnails/thumbnail-output.ts'
import { getThumbnailRequestByteLength, isThumbnailRequestWithinBudget, MAX_THUMBNAIL_REQUEST_BYTES } from '../lib/thumbnails/thumbnail-request.ts'
import { THUMBNAIL_CLIENT_TIMEOUT_MS, THUMBNAIL_PROVIDER_TIMEOUT_MS, THUMBNAIL_ROUTE_MAX_DURATION_SECONDS } from '../lib/thumbnails/thumbnail-runtime.ts'
import sharp from 'sharp'

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
  assert.equal(resolveStudioImageSize('fast'), '1K')
  assert.equal(resolveStudioImageSize('pro'), '2K')
  for (const aspectRatio of ['16:9','3:2','1:1','9:16','2:3']) {
    const request = buildNanoBananaImageRequest({ prompt: 'Exact headline', frameDataUrl: 'data:image/png;base64,YQ==', aspectRatio, imageSize: '2K' })
    assert.deepEqual(request.generationConfig.imageConfig, { aspectRatio, imageSize: '2K' })
    assert.equal(request.contents[0].parts[2].inline_data.data, 'YQ==')
  }
})

test('generated thumbnails are returned as compact WebP under the server response budget', async () => {
  const source = await sharp({ create: { width: 2400, height: 1600, channels: 3, background: '#345678' } }).png().toBuffer()
  const compact = await compactGeneratedThumbnail(`data:image/png;base64,${source.toString('base64')}`)
  assert.match(compact, /^data:image\/webp;base64,/)
  assert.ok(Buffer.byteLength(compact, 'utf8') <= MAX_THUMBNAIL_DATA_URL_BYTES)
  const image = await sharp(Buffer.from(compact.split(',')[1], 'base64')).metadata()
  assert.ok(image.width <= 1920)
  assert.ok(image.height <= 1920)
  await assert.rejects(compactGeneratedThumbnail('data:text/html;base64,PGgxPmVycm9yPC9oMT4='), /unsupported image format/)
})

test('studio request size guard keeps image data below the serverless upload limit', () => {
  const safeRequest = { frameDataUrl: 'data:image/jpeg;base64,' + 'A'.repeat(MAX_THUMBNAIL_REQUEST_BYTES - 200) }
  const oversizedRequest = { frameDataUrl: 'data:image/jpeg;base64,' + 'A'.repeat(MAX_THUMBNAIL_REQUEST_BYTES) }
  assert.ok(getThumbnailRequestByteLength(safeRequest) <= MAX_THUMBNAIL_REQUEST_BYTES)
  assert.equal(isThumbnailRequestWithinBudget(safeRequest), true)
  assert.ok(getThumbnailRequestByteLength(oversizedRequest) > MAX_THUMBNAIL_REQUEST_BYTES)
  assert.equal(isThumbnailRequestWithinBudget(oversizedRequest), false)
})

test('image generation timing stays within Vercel request and route deadlines', () => {
  assert.ok(THUMBNAIL_PROVIDER_TIMEOUT_MS < THUMBNAIL_ROUTE_MAX_DURATION_SECONDS * 1000)
  assert.ok(THUMBNAIL_CLIENT_TIMEOUT_MS > THUMBNAIL_PROVIDER_TIMEOUT_MS)
  assert.ok(THUMBNAIL_CLIENT_TIMEOUT_MS < THUMBNAIL_ROUTE_MAX_DURATION_SECONDS * 1000)
  const route = readFileSync('app/api/projects/[id]/thumbnails/nano-banana/route.ts', 'utf8')
  const routeDuration = Number(route.match(/export const maxDuration = (\d+)/)?.[1])
  assert.equal(routeDuration, THUMBNAIL_ROUTE_MAX_DURATION_SECONDS)
  assert.match(route, /AbortSignal\.timeout\(THUMBNAIL_PROVIDER_TIMEOUT_MS\)/)
  assert.match(route, /generativelanguage\.googleapis\.com\/v1\/models\//)
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
  await assert.rejects(readThumbnailGenerationResponse(new Response('<!DOCTYPE html><title>Gateway</title>', { status: 502, headers: { 'Content-Type': 'text/html', 'x-vercel-error': 'NO_RESPONSE_FROM_FUNCTION', 'x-vercel-id': 'sfo1::abc-123' } })), /HTTP 502, text\/html.*Vercel details: NO_RESPONSE_FROM_FUNCTION, request sfo1::abc-123.*Check the Vercel function logs/)
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
