import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const root = process.cwd()

function read(relativePath) {
  return readFileSync(join(root, relativePath), 'utf8')
}

function run() {
  assert.equal(existsSync(join(root, 'public/branding/prometheus-logo-no-bg.png')), true)

  assert.equal(existsSync(join(root, 'components/ui/minimal-typographic-loader.tsx')), false)

  const loadingAnimation = read('components/loading-animation/LoadingAnimation.tsx')
  const ringRenderer = read('components/loading-animation/RingRenderer.ts')
  assert.match(loadingAnimation, /CanvasLoadingAnimation/)
  assert.match(loadingAnimation, /<canvas/)
  assert.match(ringRenderer, /RING_SEGMENTS = 72/)
  assert.match(ringRenderer, /PALETTE/)
  assert.equal(ringRenderer.includes('three'), false)
  assert.equal(ringRenderer.includes('gsap'), false)

  const globals = read('app/globals.css')
  assert.equal(globals.includes('prometheus-aperture-loader'), false)
  assert.equal(globals.includes('prometheus-infinity-mark'), false)
  assert.equal(globals.includes('mix-blend-screen'), false)
  assert.equal(globals.includes('@react-three'), false)

  const editorLoading = read('app/editor/loading.tsx')
  assert.match(editorLoading, /EditorLoadingScreen/)
  assert.equal(editorLoading.includes('animate-spin'), false)
}

run()
