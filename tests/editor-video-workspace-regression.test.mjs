import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const root = process.cwd()

function read(relativePath) {
  return readFileSync(join(root, relativePath), 'utf8')
}

function assertNoBlackArtifactTokens(source, label) {
  assert.equal(source.includes('bg-black'), false, `${label} must not use bg-black`)
  assert.equal(/box-shadow\s*:\s*[^;]*#000/i.test(source), false, `${label} must not use #000 box-shadow`)
  assert.equal(/shadow-\[[^\]]*#000/i.test(source), false, `${label} must not use #000 Tailwind shadows`)
  assert.equal(/drop-shadow\([^)]*(black|#000)/i.test(source), false, `${label} must not use black drop shadows`)
}

function run() {
  const infinityPath = 'components/editor/InfinityLoader.tsx'
  const dockPath = 'components/editor/AspectRatioDock.tsx'
  const workspacePath = 'components/editor/VideoWorkspace.tsx'

  assert.equal(existsSync(join(root, infinityPath)), true, 'InfinityLoader deliverable is missing')
  assert.equal(existsSync(join(root, dockPath)), true, 'AspectRatioDock deliverable is missing')
  assert.equal(existsSync(join(root, workspacePath)), true, 'VideoWorkspace deliverable is missing')

  const loader = read(infinityPath)
  assert.match(loader, /export type InfinityLoaderMode = 'infinity' \| 'status' \| 'dock-hint'/)
  assert.match(loader, /fixed inset-0 z-\[9999\] pointer-events-none flex items-center justify-center/)
  assert.match(loader, /absolute inset-0 bg-\[#0A0A0C\]\/90 backdrop-blur-sm/)
  assert.match(loader, /AnimatePresence/)
  assert.match(loader, /visible \?/)
  assert.match(loader, /viewBox="0 0 120 60"/)
  assert.match(loader, /id="infinity-glow"/)
  assert.match(loader, /strokeDasharray/)
  assert.match(loader, /strokeDashoffset/)
  assert.match(loader, /2\.4s/)
  assert.match(loader, /0\.8s/)
  assert.match(loader, /0\.4/)
  assert.match(loader, /rgba\(255,255,255,0\.06\)/)
  assert.match(loader, /rgba\(100, 200, 220, 0\.9\)/)
  assert.match(loader, /rgba\(160, 100, 220, 0\.9\)/)
  assert.match(loader, /text-\[11px\] uppercase tracking-\[0\.2em\] text-\[#444\] mt-6/)
  assert.match(loader, /mode === 'status'/)
  assert.match(loader, /mode === 'dock-hint'/)
  assertNoBlackArtifactTokens(loader, 'InfinityLoader')

  const dock = read(dockPath)
  assert.match(dock, /export function AspectRatioDock/)
  for (const label of ['Native', 'Wide', 'Vertical', 'Square', 'Fill', 'Fit', 'Import']) {
    assert.match(dock, new RegExp(label), `Dock item ${label} is missing`)
  }
  assert.match(dock, /48/)
  assert.match(dock, /1\.25/)
  assert.match(dock, /1\.1/)
  assert.match(dock, /1\.05/)
  assert.match(dock, /absolute bottom-6 left-1\/2 z-20 -translate-x-1\/2/)
  assert.match(dock, /bg-\[rgba\(255,255,255,0\.06\)\]/)
  assert.match(dock, /\[backdrop-filter:blur\(20px\)\]/)
  assert.match(dock, /border-\[rgba\(255,255,255,0\.08\)\]/)
  assert.match(dock, /rounded-\[24px\]/)
  assert.match(dock, /shadow-\[0_8px_32px_rgba\(0,0,0,0\.4\),inset_0_1px_0_rgba\(255,255,255,0\.05\)\]/)
  assert.match(dock, /onImport/)
  assertNoBlackArtifactTokens(dock, 'AspectRatioDock')

  const workspace = read(workspacePath)
  assert.match(workspace, /export function VideoWorkspace/)
  assert.match(workspace, /relative overflow-hidden rounded-\[16px\]/)
  assert.match(workspace, /bg-\[rgba\(255,255,255,0\.02\)\]/)
  assert.match(workspace, /border-\[rgba\(255,255,255,0\.05\)\]/)
  assert.match(workspace, /<InfinityLoader/)
  assert.match(workspace, /<AspectRatioDock/)
  assert.match(workspace, /text-\[#444\]/)
  assert.match(workspace, /size-12/)
  assert.match(workspace, /2s/)
  assertNoBlackArtifactTokens(workspace, 'VideoWorkspace')

  const previewCanvas = read('components/editor/PreviewCanvas.tsx')
  assert.match(previewCanvas, /VideoWorkspace/)
  assert.match(previewCanvas, /previewFramePreset/)
  assert.match(previewCanvas, /onPreviewFramePresetChange/)
  assert.match(previewCanvas, /onFitModeChange/)
  assert.match(previewCanvas, /width 0\.4s cubic-bezier\(0\.25, 0\.46, 0\.45, 0\.94\), height 0\.4s cubic-bezier\(0\.25, 0\.46, 0\.45, 0\.94\)/)
  assertNoBlackArtifactTokens(previewCanvas, 'PreviewCanvas')

  const editorPage = read('app/editor/[id]/page.tsx')
  assert.match(editorPage, /previewFramePreset=\{previewFramePreset\}/)
  assert.match(editorPage, /onPreviewFramePresetChange=\{setPreviewFramePreset\}/)
  assert.match(editorPage, /onFitModeChange=\{setFitMode\}/)

  const previewGenerationState = read('components/editor/preview-generation-state.tsx')
  assert.match(previewGenerationState, /InfinityLoader/)
  assert.match(previewGenerationState, /mode="status"/)
  assertNoBlackArtifactTokens(previewGenerationState, 'PreviewGenerationState')

  const editorLoadingScreen = read('components/editor/editor-loading-screen.tsx')
  assert.match(editorLoadingScreen, /InfinityLoader/)
  assertNoBlackArtifactTokens(editorLoadingScreen, 'EditorLoadingScreen')

  const demoPage = read('app/editor/video-workspace-demo/page.tsx')
  assert.match(demoPage, /VideoWorkspace/)
  assert.match(demoPage, /loaderMode/)
  assert.match(demoPage, /setLoaderMode/)
}

run()
