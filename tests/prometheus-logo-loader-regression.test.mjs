import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const root = process.cwd()

function read(relativePath) {
  return readFileSync(join(root, relativePath), 'utf8')
}

function run() {
  assert.equal(existsSync(join(root, 'public/branding/prometheus-logo-no-bg.png')), true)

  const loader = read('components/ui/minimal-typographic-loader.tsx')
  assert.match(loader, /PrometheusLogoShaderMark/)
  assert.match(loader, /prometheus-logo-shader-mark/)
  assert.match(loader, /prometheus-logo-loader/)
  assert.equal(loader.includes('PrometheusInfinityMark'), false)
  assert.equal(loader.includes('prometheus-infinity-mark'), false)
  assert.equal(loader.includes('next/image'), false)
  assert.equal(loader.includes('<video'), false)
  assert.equal(loader.includes('<canvas'), false)
  assert.equal(loader.includes('three'), false)
  assert.equal(loader.includes('gsap'), false)
  assert.equal(loader.includes('/loaders/prometheus-infinity-loader.gif'), false)

  const globals = read('app/globals.css')
  assert.match(globals, /--prometheus-logo-mask:\s*url\('\/branding\/prometheus-logo-no-bg\.png'\)/)
  assert.match(globals, /\.prometheus-logo-shader-mark/)
  assert.match(globals, /\.prometheus-logo-shader-mark__silhouette/)
  assert.match(globals, /\.prometheus-logo-shader-mark__caustic/)
  assert.match(globals, /\.prometheus-logo-shader-mark__sweep/)
  assert.match(globals, /@keyframes prometheus-logo-shader-sweep/)
  assert.match(globals, /@keyframes prometheus-logo-caustic-drift/)
  assert.match(globals, /prefers-reduced-motion: reduce/)
  assert.match(globals, /prometheus-logo-shader-mark\.is-reduced-motion/)
  assert.equal(globals.includes('mix-blend-screen'), false)
  assert.equal(globals.includes('@react-three'), false)

  const editorLoading = read('app/editor/loading.tsx')
  assert.match(editorLoading, /EditorLoadingScreen/)
  assert.equal(editorLoading.includes('animate-spin'), false)
}

run()
