import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const root = process.cwd()

function read(relativePath) {
  return readFileSync(join(root, relativePath), 'utf8')
}

function run() {
  const globals = read('app/globals.css')
  assert.match(globals, /premium-motion-surface/)
  assert.match(globals, /premium-liquid-pill/)
  assert.match(globals, /premium-icon-orbit/)
  assert.match(globals, /premium-telemetry-panel/)
  assert.match(globals, /@keyframes premium-hud-scan/)
  assert.match(globals, /@media \(prefers-reduced-motion: reduce\)/)

  const uploadInterface = read('components/video-upload-interface.tsx')
  assert.match(uploadInterface, /premium-motion-surface/)
  assert.match(uploadInterface, /premium-liquid-pill/)
  assert.match(uploadInterface, /premium-icon-orbit/)
  assert.match(uploadInterface, /StudioCinematicMarqueeRails/)
  assert.match(uploadInterface, /studio-cinematic-rails/)
  assert.match(uploadInterface, /EDIT_ACTIONS_SESSION_KEY/)
  assert.match(uploadInterface, /Edit direction:/)
  assert.match(uploadInterface, /onSelectAction/)

  const chatStyleSelector = read('components/editor/chat-style-selector.tsx')
  assert.match(chatStyleSelector, /premium-icon-orbit/)
  assert.match(chatStyleSelector, /premium-telemetry-panel/)
  assert.match(chatStyleSelector, /premium-liquid-pill/)

  const editorPage = read('app/editor/[id]/page.tsx')
  assert.match(editorPage, /premium-motion-surface/)
  assert.match(editorPage, /premium-telemetry-panel/)
  assert.match(editorPage, /premium-icon-orbit/)
  assert.match(editorPage, /premium-liquid-pill/)
}

run()
