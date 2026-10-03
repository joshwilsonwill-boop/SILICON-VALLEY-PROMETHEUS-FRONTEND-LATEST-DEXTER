import assert from 'node:assert/strict'
import { test } from 'node:test'
import { ThumbnailEngine } from '../lib/thumbnails/thumbnail-engine'
import { formatSourceAspectRatio, getMediaFailureMessage } from '../lib/media/feedback'

test('portrait and landscape metadata use familiar aspect ratios', () => {
  assert.equal(formatSourceAspectRatio(1080, 1920), '9:16')
  assert.equal(formatSourceAspectRatio(1920, 1080), '16:9')
  assert.equal(formatSourceAspectRatio(1000, 1000), '1:1')
  assert.equal(formatSourceAspectRatio(0, 0), 'Unknown')
})

test('microphone failures distinguish permissions, missing device and service credentials', () => {
  assert.match(getMediaFailureMessage(new DOMException('Permission denied', 'NotAllowedError')), /microphone.*blocked/i)
  assert.match(getMediaFailureMessage(new DOMException('No device', 'NotFoundError')), /microphone.*found/i)
  assert.match(getMediaFailureMessage(new Error('Gemini Live WebSocket connection failed. Verify the network connection and server credentials.')), /voice service.*unavailable/i)
})

test('thumbnail export handles an unsafe canvas without leaking a browser exception', () => {
  const original = globalThis.document
  globalThis.document = { createElement: () => ({ getContext: () => ({ drawImage() {} }), toDataURL() { throw new DOMException('Tainted canvases may not be exported', 'SecurityError') } }) } as unknown as Document
  try {
    assert.throws(() => ThumbnailEngine.captureFrameFromVideo({ readyState: 2, videoWidth: 1280, videoHeight: 720, currentTime: 0 } as HTMLVideoElement), /source image|frame.*permission/i)
  } finally { globalThis.document = original }
})

test('a loaded safe frame remains usable', () => {
  const original = globalThis.document
  globalThis.document = { createElement: () => ({ getContext: () => ({ drawImage() {} }), toDataURL: () => 'data:image/jpeg;base64,safe' }) } as unknown as Document
  try {
    const frame = ThumbnailEngine.captureFrameFromVideo({ readyState: 2, videoWidth: 1280, videoHeight: 720, currentTime: 2 } as HTMLVideoElement)
    assert.equal(frame?.dataUrl, 'data:image/jpeg;base64,safe')
    assert.equal(frame?.timeSec, 2)
  } finally { globalThis.document = original }
})

test('music tab panel initializes volume to integer 80 and provides timeline removal', async () => {
  const { readFileSync } = await import('node:fs')
  const { join } = await import('node:path')
  const content = readFileSync(join(process.cwd(), 'components/editor/music-tab-panel.tsx'), 'utf8')
  assert.match(content, /const \[volume, setVolume\] = React\.useState\(80\)/)
  assert.doesNotMatch(content, /const \[volume, setVolume\] = React\.useState\(0\.8\)/)
  assert.match(content, /onRemoveFromTimeline/)
  assert.match(content, /Remove from timeline/)
  assert.doesNotMatch(content, /<Folder className="size-5" \/> New folder/)
})

test('ai chat hook clears streamStatus and completes active status on done', async () => {
  const { readFileSync } = await import('node:fs')
  const { join } = await import('node:path')
  const hookContent = readFileSync(join(process.cwd(), 'hooks/use-ai-chat.ts'), 'utf8')
  assert.match(hookContent, /event\.type === "done"[\s\S]*?setStreamStatus\(null\)[\s\S]*?state: "complete"/)
})

