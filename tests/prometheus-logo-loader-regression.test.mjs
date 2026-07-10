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
  assert.match(loader, /PrometheusApertureLoader/)
  assert.match(loader, /prometheus-aperture-loader/)
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
  assert.match(globals, /\.prometheus-aperture-loader/)
  assert.match(globals, /\.prometheus-aperture-loader__mark/)
  assert.match(globals, /\.prometheus-aperture-loader__ring/)
  assert.match(globals, /\.prometheus-aperture-loader__scan/)
  assert.match(globals, /@keyframes prometheus-aperture-scan/)
  assert.match(globals, /@keyframes prometheus-aperture-ring/)
  assert.match(globals, /prefers-reduced-motion: reduce/)
  assert.match(globals, /prometheus-aperture-loader\.is-reduced-motion/)
  assert.equal(globals.includes('mix-blend-screen'), false)
  assert.equal(globals.includes('@react-three'), false)

  const editorLoading = read('app/editor/loading.tsx')
  assert.match(editorLoading, /EditorLoadingScreen/)
  assert.equal(editorLoading.includes('animate-spin'), false)
}

run()
