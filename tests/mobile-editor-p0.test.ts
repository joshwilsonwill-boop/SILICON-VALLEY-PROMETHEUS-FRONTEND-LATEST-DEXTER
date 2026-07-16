import assert from 'node:assert/strict'

import { MB, describeAttachment } from '@/lib/editor/chat-attachment'
import { formatSourceStatus } from '@/lib/editor/media-metadata'

assert.deepEqual(
  describeAttachment({ name: 'frame.png', size: 20 * MB, type: 'image/png' }),
  { kind: 'image', valid: true },
)
assert.equal(
  describeAttachment({ name: 'frame.png', size: 20 * MB + 1, type: 'image/png' }).message,
  'Image too large. Maximum size is 20MB.',
)
assert.deepEqual(
  describeAttachment({ name: 'clip.mp4', size: 100 * MB, type: 'video/mp4' }),
  { kind: 'video', valid: true },
)
assert.equal(
  describeAttachment({ name: 'clip.mp4', size: 100 * MB + 1, type: 'video/mp4' }).message,
  'Video too large. Maximum size is 100MB.',
)
assert.deepEqual(
  formatSourceStatus({ duration: 32.4, height: 1080, size: 4_194_304, width: 1920 }),
  { duration: '00:32', fileSize: '4 MB', resolution: '1920 × 1080' },
)
assert.deepEqual(formatSourceStatus({}), { duration: '—', fileSize: '—', resolution: '—' })
