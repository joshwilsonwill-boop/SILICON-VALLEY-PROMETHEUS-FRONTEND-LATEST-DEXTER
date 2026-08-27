import test from 'node:test'
import assert from 'node:assert/strict'

import { float32ToPcm16, pcm16LeToFloat32 } from '../live-audio'

test('converts and clamps Float32 microphone samples to PCM16', () => {
  const pcm = float32ToPcm16(new Float32Array([-2, -1, 0, 0.5, 1, 2]))
  assert.deepEqual([...pcm], [-32768, -32768, 0, 16384, 32767, 32767])
})

test('decodes little-endian PCM16 model output', () => {
  const source = new Int16Array([-32768, 0, 32767])
  const decoded = pcm16LeToFloat32(source.buffer)
  assert.deepEqual([...decoded], [-1, 0, 32767 / 32768])
})
