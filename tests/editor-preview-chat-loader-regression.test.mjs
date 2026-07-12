import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const root = process.cwd()

function read(relativePath) {
  return readFileSync(join(root, relativePath), 'utf8')
}

function run() {
  const editorPage = read('app/editor/[id]/page.tsx')
  assert.match(editorPage, /visiblePreviewUrl: sourceStageVisiblePreviewUrl/)
  assert.match(editorPage, /currentPreviewUrl: stableProjectPreviewUrl/)
  assert.match(editorPage, /const previewUrl = sourceStageVisiblePreviewUrl \?\? stableProjectPreviewUrl \?\? ''/)
  assert.match(editorPage, /resolvedComposerPortalTarget/)
  assert.match(editorPage, /document\.body/)
  assert.match(editorPage, /createPortal\([\s\S]*resolvedComposerPortalTarget/)

  assert.equal(existsSync(join(root, 'components/ui/minimal-typographic-loader.tsx')), false)
  const loadingAnimation = read('components/loading-animation/LoadingAnimation.tsx')
  const ringRenderer = read('components/loading-animation/RingRenderer.ts')
  assert.match(editorPage, /InlineLoadingAnimation/)
  assert.match(loadingAnimation, /CanvasLoadingAnimation/)
  assert.match(ringRenderer, /RING_SEGMENTS = 72/)

  const sourceStagePlaceholder = read('components/editor/source-stage-placeholder.tsx')
  assert.match(sourceStagePlaceholder, /!isLoading \? \(/)
  assert.equal(sourceStagePlaceholder.includes("isLoading && 'opacity-28'"), false)
  assert.equal(sourceStagePlaceholder.includes('MinimalTypographicLoader'), false)
  assert.equal(sourceStagePlaceholder.includes('prometheus-infinity-loader'), false)

  const previewCanvas = read('components/editor/PreviewCanvas.tsx')
  assert.equal(previewCanvas.includes('MinimalTypographicLoader'), false)
  assert.equal(previewCanvas.includes('prometheus-infinity-loader'), false)
  assert.equal(previewCanvas.includes('bg-black/15 px-6'), false)
  assert.equal(previewCanvas.includes('Loading source preview'), false)
  assert.equal(previewCanvas.includes('isPreviewLoadingVisible ?'), false)

  const uploadInterface = read('components/video-upload-interface.tsx')
  assert.match(uploadInterface, /footerAction\?: React\.ReactNode/)
  assert.match(uploadInterface, /studioActionButtonClassName/)
  assert.match(uploadInterface, /rounded-\[8px\]/)
  assert.match(uploadInterface, /text-\[11px\]/)
  assert.match(uploadInterface, /footerAction=\{/)
  assert.equal(uploadInterface.includes('rounded-xl border px-3 py-2 text-sm'), false)
}

run()
