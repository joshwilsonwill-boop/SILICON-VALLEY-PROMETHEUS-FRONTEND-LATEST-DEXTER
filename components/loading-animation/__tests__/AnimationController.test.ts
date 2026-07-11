import assert from 'node:assert/strict'
import test from 'node:test'

import {
  AnimationController,
  CYCLE_DURATION,
  PHASE_TIMINGS,
} from '../AnimationController'

const EPSILON = 1e-6

function approximately(actual: number, expected: number, epsilon = EPSILON) {
  assert.ok(
    Math.abs(actual - expected) <= epsilon,
    `expected ${actual} to be within ${epsilon} of ${expected}`,
  )
}

test('uses the exact 3.5 second phase schedule', () => {
  assert.equal(CYCLE_DURATION, 3500)
  assert.deepEqual(PHASE_TIMINGS, {
    rotating: { start: 0, end: 830, duration: 830 },
    tilting: { start: 830, end: 1170, duration: 340 },
    contracting: { start: 1170, end: 2170, duration: 1000 },
    black: { start: 2170, end: 2330, duration: 160 },
    rebuilding: { start: 2330, end: 3170, duration: 840 },
    settling: { start: 3170, end: 3500, duration: 330 },
  })
})

test('selects phases and local progress at every boundary', () => {
  const controller = new AnimationController(0)

  assert.equal(controller.update(0).phase, 'rotating')
  assert.equal(controller.update(829.999).phase, 'rotating')
  assert.equal(controller.update(830).phase, 'tilting')
  assert.equal(controller.update(1170).phase, 'contracting')
  assert.equal(controller.update(2170).phase, 'black')
  assert.equal(controller.update(2330).phase, 'rebuilding')
  assert.equal(controller.update(3170).phase, 'settling')

  const halfwayTilt = controller.update(1000)
  approximately(halfwayTilt.phaseProgress, 0.5)
  approximately(halfwayTilt.cycleProgress, 1000 / CYCLE_DURATION)
})

test('rotates clockwise at exactly 90 degrees per second before collapse', () => {
  const controller = new AnimationController(0)
  const start = controller.update(0)
  const halfSecond = controller.update(500)
  const oneSecond = controller.update(1000)

  approximately(start.rotation, 0)
  approximately(halfSecond.rotation, Math.PI / 4)
  approximately(oneSecond.rotation, Math.PI / 2)
  assert.ok(oneSecond.rotation > halfSecond.rotation)
})

test('tilts, forms the bottom blob, and contracts to the specified minimum', () => {
  const controller = new AnimationController(0)
  const tiltStart = controller.update(830)
  const tiltEnd = controller.update(1170)
  const contractEnd = controller.update(2169.999)

  approximately(tiltStart.tilt, 0)
  approximately(tiltStart.ringRadius, 0.18)
  approximately(tiltStart.blobWidth, 0)
  approximately(tiltEnd.tilt, Math.PI / 4)
  approximately(tiltEnd.ringRadius, 0.18)
  approximately(tiltEnd.blobWidth, 0.06)
  approximately(tiltEnd.blobHeight, 0.08)
  assert.ok(contractEnd.tilt > Math.PI / 2 - 0.001)
  assert.ok(contractEnd.ringRadius > 0.019999)
  assert.ok(contractEnd.ringRadius < 0.02001)
  assert.ok(contractEnd.opacity < 0.00001)
})

test('keeps full opacity for half the contraction then eases out over 500ms', () => {
  const controller = new AnimationController(0)

  approximately(controller.update(1170).opacity, 1)
  approximately(controller.update(1669.999).opacity, 1)
  assert.ok(controller.update(1920).opacity < 1)
  assert.ok(controller.update(1920).opacity > 0)
  assert.ok(controller.update(2169.999).opacity < 0.00001)
  approximately(controller.update(2170).opacity, 0)
})

test('rebuilds from two percent radius and reforms the dot with overshoot', () => {
  const controller = new AnimationController(0)
  const start = controller.update(2330)
  const middle = controller.update(2750)
  const nearEnd = controller.update(3050)
  const end = controller.update(3170)

  approximately(start.tilt, Math.PI / 2)
  approximately(start.ringRadius, 0.02)
  approximately(start.opacity, 0)
  assert.ok(middle.ringRadius > start.ringRadius)
  assert.ok(middle.blobWidth > 0)
  assert.ok(nearEnd.centerDotRadius > 0.025)
  approximately(end.ringRadius, 0.18)
  approximately(end.tilt, 0)
  approximately(end.opacity, 1)
})

test('returns to an equivalent visible state at the loop seam', () => {
  const controller = new AnimationController(0)
  const start = controller.update(0)
  const seam = controller.update(CYCLE_DURATION)
  const justBeforeSeam = controller.update(CYCLE_DURATION - 0.001)

  assert.equal(seam.phase, start.phase)
  approximately(seam.rotation, start.rotation)
  approximately(seam.tilt, start.tilt)
  approximately(seam.ringRadius, start.ringRadius)
  approximately(seam.centerDotRadius, start.centerDotRadius)
  approximately(seam.opacity, start.opacity)
  assert.ok(Math.abs(justBeforeSeam.rotation - Math.PI * 2) < 0.001)
  approximately(justBeforeSeam.ringRadius, start.ringRadius, 0.00001)
  approximately(justBeforeSeam.tilt, start.tilt, 0.00001)
  approximately(justBeforeSeam.opacity, start.opacity, 0.00001)
})

test('pauses elapsed animation time while the document is hidden', () => {
  const controller = new AnimationController(100)
  const beforePause = controller.update(600)

  controller.pause(700)
  const pausedState = controller.update(700)
  const whilePaused = controller.update(1700)
  controller.resume(1700)
  const afterResume = controller.update(1800)

  approximately(whilePaused.cycleProgress, pausedState.cycleProgress)
  approximately(afterResume.cycleProgress, (beforePause.cycleProgress * CYCLE_DURATION + 200) / CYCLE_DURATION)
})
