import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import {
  wrap,
  clamp,
  stringY,
  springStep,
  swingStep,
  nearestAt,
  pad2,
  DEFAULT_SLIDES,
  PALETTES,
  mulberry32,
  hexRgb,
  mixRgb,
} from '../components/ui/polaroid-line-carousel'

const root = process.cwd()

function run() {
  console.log('Testing PolaroidLineCarousel logic and primitives...')

  // 1. Math and layout primitives
  assert.equal(wrap(0, 5), 0)
  assert.equal(wrap(5, 5), 0)
  assert.equal(wrap(-1, 5), 4)
  assert.equal(wrap(7, 5), 2)
  assert.equal(wrap(0, 0), 0)

  assert.equal(clamp(10, 0, 5), 5)
  assert.equal(clamp(-2, 0, 5), 0)
  assert.equal(clamp(3, 0, 5), 3)

  // stringY: parabola sagging by `sag` between 0 and w at y0
  const yStart = stringY(0, 1000, 100, 50)
  const yEnd = stringY(1000, 1000, 100, 50)
  const yMid = stringY(500, 1000, 100, 50)
  assert.equal(Math.round(yStart), 100)
  assert.equal(Math.round(yEnd), 100)
  assert.equal(Math.round(yMid), 150) // y0 + sag

  // springStep
  const [nextX, nextV] = springStep(0, 0, 100, 0.016)
  assert.ok(nextX > 0, 'spring step moves towards target')
  assert.ok(nextV > 0, 'spring step generates velocity towards target')

  // swingStep
  const [swingA, swingW] = swingStep(0, 0, 500, 0.016, 1)
  assert.ok(swingW > 0, 'positive line velocity produces swing acceleration')
  assert.ok(swingA >= -0.6 && swingA <= 0.6, 'swing angle is clamped within bounds')

  // nearestAt
  assert.equal(nearestAt(0, 300, 6), 0)
  assert.equal(nearestAt(290, 300, 6), 1)
  assert.equal(nearestAt(610, 300, 6), 2)
  assert.equal(nearestAt(2000, 300, 6), 5) // clamped to n-1

  // pad2
  assert.equal(pad2(1), '01')
  assert.equal(pad2(9), '09')
  assert.equal(pad2(10), '10')
  assert.equal(pad2(12), '12')

  // 2. Palette and procedural canvas helpers
  assert.ok(PALETTES.dawn && PALETTES.alpine && PALETTES.dusk && PALETTES.mist)
  assert.equal(PALETTES.dawn.sun, '#fff4df')
  assert.deepEqual(hexRgb('#ffffff'), [255, 255, 255])
  assert.deepEqual(hexRgb('#000000'), [0, 0, 0])
  assert.equal(mixRgb('#000000', '#ffffff', 0.5), 'rgb(128,128,128)')

  const rng = mulberry32(42)
  const val1 = rng()
  const val2 = rng()
  assert.ok(val1 >= 0 && val1 < 1)
  assert.ok(val2 >= 0 && val2 < 1)
  assert.notEqual(val1, val2)

  assert.equal(DEFAULT_SLIDES.length, 6)
  assert.ok(DEFAULT_SLIDES.every((s) => s.title && s.palette))

  // 3. File existence and structure
  const carouselPath = join(root, 'components/ui/polaroid-line-carousel.tsx')
  assert.ok(existsSync(carouselPath), 'components/ui/polaroid-line-carousel.tsx exists')
  const carouselContent = readFileSync(carouselPath, 'utf8')
  assert.match(carouselContent, /export function PolaroidLineCarousel/)
  assert.match(carouselContent, /export default PolaroidLineCarousel/)
  assert.match(carouselContent, /\.pl-string/)
  assert.match(carouselContent, /\.pl-card/)
  assert.match(carouselContent, /\.pl-peg/)
  assert.match(carouselContent, /\.pl-print/)
  assert.match(carouselContent, /paintLandscape/)

  // 4. Dashboard integration check
  const dashboardPath = join(root, 'components/analytics/VideoPerformanceDashboard.tsx')
  assert.ok(existsSync(dashboardPath), 'VideoPerformanceDashboard.tsx exists')
  const dashboardContent = readFileSync(dashboardPath, 'utf8')
  assert.match(dashboardContent, /PolaroidLineCarousel/, 'Dashboard imports PolaroidLineCarousel')
  assert.match(dashboardContent, /carouselSlides|carouselVideos/, 'Dashboard derives carousel slides for tracked videos')
  assert.match(dashboardContent, /<PolaroidLineCarousel/, 'Dashboard renders PolaroidLineCarousel')

  console.log('polaroid line carousel verification passed')
}

run()
