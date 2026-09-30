import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import test from 'node:test'

const source = readFileSync(join(process.cwd(), 'components/ui/gooey-text-morphing.tsx'), 'utf8')

test('Gooey headline animation only runs while visible', () => {
  assert.match(source, /new IntersectionObserver\(/)
  assert.match(source, /document\.addEventListener\("visibilitychange"/)
  assert.match(source, /const shouldAnimate = isInViewport && isPageVisible/)
  assert.match(source, /window\.cancelAnimationFrame\(animationRef\.current\)/)
})

test('Gooey cooldown does not rewrite unchanged styles every frame', () => {
  assert.match(source, /style\.opacity !== "100%"/)
  assert.match(source, /style\.opacity !== "0%"/)
})

test('Studio upload updates are gated to meaningful progress changes', () => {
  const uploadSource = readFileSync(join(process.cwd(), 'components/video-upload-interface.tsx'), 'utf8')
  assert.match(uploadSource, /const progressBucket = Math\.floor\(progress\.percentage \/ 2\)/)
  assert.match(uploadSource, /if \(!shouldUpdateUi\) return/)
  assert.match(uploadSource, /progress\.phase === 'done'/)
  assert.match(uploadSource, /const logBucket = Math\.floor\(progress\.percentage \/ 10\)/)
})
