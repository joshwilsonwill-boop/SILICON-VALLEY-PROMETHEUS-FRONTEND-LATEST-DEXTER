import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const root = process.cwd()

function read(relativePath) {
  return readFileSync(join(root, relativePath), 'utf8')
}

function run() {
  const editorPage = read('app/editor/[id]/page.tsx')
  assert.equal(editorPage.includes("import { InspectorPanel }"), false)
  assert.equal(editorPage.includes('<InspectorPanel'), false)
  assert.equal(editorPage.includes('lg:grid-cols-[minmax(0,1fr)_clamp(17rem,22vw,20.5rem)]'), false)
  assert.match(editorPage, /activeWorkspaceTab === 'Motion'[\s\S]*\? 'gap-0 lg:grid-cols-\[minmax\(0,1fr\)\]'[\s\S]*: 'lg:grid-cols-\[minmax\(0,1fr\)\]'/)

  const inspectorPanel = read('components/editor/InspectorPanel.tsx')
  assert.equal(inspectorPanel.includes("import { LiquidFrameSelector }"), false)
  assert.equal(inspectorPanel.includes('<LiquidFrameSelector'), false)
  assert.equal(inspectorPanel.includes('onFitModeChange'), false)
  assert.equal(inspectorPanel.includes('Frame aspect selector'), false)

  const selector = read('components/editor/liquid-frame-selector.tsx')
  for (const removedLabel of ['16:9', '9:16', '1:1', 'fill', 'fit', 'Import']) {
    assert.equal(selector.includes(removedLabel), false, removedLabel)
  }
}

run()
