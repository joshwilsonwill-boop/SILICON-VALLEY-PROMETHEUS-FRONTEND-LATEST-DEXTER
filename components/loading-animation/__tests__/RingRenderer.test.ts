import assert from 'node:assert/strict'
import test from 'node:test'

import {
  MAX_CANVAS_BUFFER_BYTES,
  PALETTE,
  REFLECTION_OPACITY,
  RING_SEGMENTS,
  capDevicePixelRatio,
  estimateCanvasBufferBytes,
  getCanvasPixelRatio,
  getLayoutMetrics,
} from '../RingRenderer'

function approximately(actual: number, expected: number) {
  assert.ok(Math.abs(actual - expected) < 1e-9, `expected ${actual} to equal ${expected}`)
}

test('exports the exact extracted video palette', () => {
  assert.deepEqual(PALETTE, {
    background: '#000000',
    centerDot: '#F9FEFD',
    ringCore: '#F2F3FF',
    ringBody: '#1E1D2E',
    ringShadow: '#100E22',
    glowBright: '#F3FBFF',
    glowDim: '#7A7CBE',
    blobPeak: '#FFFFFF',
    blobBody: '#A7A8EE',
  })
  assert.equal(REFLECTION_OPACITY, 0.15)
  assert.equal(RING_SEGMENTS, 72)
})

test('computes full-screen geometry from the smaller container dimension', () => {
  const metrics = getLayoutMetrics(1000, 800, false)

  assert.equal(metrics.baseSize, 800)
  assert.equal(metrics.cx, 500)
  assert.equal(metrics.cy, 400)
  assert.equal(metrics.outerRadius, 144)
  approximately(metrics.innerRadius, 112)
  assert.equal(metrics.centerDotRadius, 20)
  assert.equal(metrics.blobMaxWidth, 48)
  assert.equal(metrics.reflectionOffset, 176)
  assert.equal(metrics.reflectionHeight, 120)
})

test('computes inline geometry and shifts the scene up to contain its reflection', () => {
  const metrics = getLayoutMetrics(120, 120, true)

  assert.equal(metrics.baseSize, 120)
  assert.equal(metrics.cx, 60)
  assert.equal(metrics.cy, 42)
  assert.equal(metrics.outerRadius, 42)
  approximately(metrics.innerRadius, 33.6)
  assert.equal(metrics.centerDotRadius, 6)
  approximately(metrics.blobMaxWidth, 14.4)
  assert.equal(metrics.reflectionOffset, 48)
  assert.equal(metrics.reflectionHeight, 30)
  assert.equal(metrics.cy + metrics.reflectionOffset + metrics.reflectionHeight, 120)
})

test('caps device pixel ratio at two while retaining low-density displays', () => {
  assert.equal(capDevicePixelRatio(undefined), 1)
  assert.equal(capDevicePixelRatio(0), 1)
  assert.equal(capDevicePixelRatio(0.75), 0.75)
  assert.equal(capDevicePixelRatio(1), 1)
  assert.equal(capDevicePixelRatio(1.5), 1.5)
  assert.equal(capDevicePixelRatio(3), 2)
})

test('keeps full-screen Canvas buffers within the memory ceiling', () => {
  const dpr = getCanvasPixelRatio(1920, 1080, false, 2)

  assert.ok(dpr < 1, `expected a memory-aware DPR below one, received ${dpr}`)
  assert.ok(
    estimateCanvasBufferBytes(1920, 1080, false, dpr) <= MAX_CANVAS_BUFFER_BYTES,
  )
  assert.equal(getCanvasPixelRatio(120, 120, true, 3), 2)
})
