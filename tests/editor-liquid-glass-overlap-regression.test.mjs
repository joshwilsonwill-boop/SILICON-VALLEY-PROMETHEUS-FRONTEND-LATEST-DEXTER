import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const root = process.cwd()

function read(relativePath) {
  return readFileSync(join(root, relativePath), 'utf8')
}

function run() {
  const commandZone = read('components/editor/CommandZone.tsx')
  assert.match(commandZone, /command-zone-backdrop/)
  assert.equal(commandZone.includes('<kbd'), false)
  assert.equal(commandZone.includes('action.shortcut'), false)
  assert.match(commandZone, /aria-label=\{action\.label\}/)

  const inspectorPanel = read('components/editor/InspectorPanel.tsx')
  assert.equal(inspectorPanel.includes('id="lusion-viscous-membrane"'), false)
  assert.equal(inspectorPanel.includes('liquid-video-size-chip'), false)
  assert.equal(inspectorPanel.includes('liquid-video-fit-toggle'), false)
  assert.equal(inspectorPanel.includes('liquid-video-fit-option'), false)

  const editorPage = read('app/editor/[id]/page.tsx')
  assert.equal(editorPage.includes('<InspectorPanel'), false)

  const globalStyles = read('app/globals.css')
  assert.match(globalStyles, /\.command-zone-backdrop/)
  assert.match(globalStyles, /prefers-reduced-motion: reduce/)
}

run()