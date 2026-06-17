import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const root = process.cwd()

function read(relativePath) {
  return readFileSync(join(root, relativePath), 'utf8')
}

function run() {
  const dockPath = 'components/editor/AspectRatioDock.tsx'
  assert.equal(existsSync(join(root, dockPath)), true)

  const dock = read(dockPath)
  assert.match(dock, /AspectRatioDock/)
  assert.match(dock, /Native/)
  assert.match(dock, /Wide/)
  assert.match(dock, /Vertical/)
  assert.match(dock, /Square/)
  assert.match(dock, /Fill/)
  assert.match(dock, /Fit/)
  assert.match(dock, /Import/)
  assert.match(dock, /1\.25/)
  assert.match(dock, /1\.1/)
  assert.match(dock, /1\.05/)

  const selectorPath = 'components/editor/liquid-frame-selector.tsx'
  assert.equal(existsSync(join(root, selectorPath)), true)

  const selector = read(selectorPath)
  assert.match(selector, /LiquidFrameSelector/)
  assert.match(selector, /logarithmicRatioStops/)
  assert.match(selector, /magneticDetents/)
  assert.match(selector, /AspectRatioDock/)
  assert.match(selector, /onPresetChange/)
  assert.match(selector, /onFitModeChange/)
  assert.equal(selector.includes('layoutId="liquid-frame-selector-thumb"'), false)
  assert.equal(selector.includes('grid grid-cols-4'), false)
  assert.equal(selector.includes('Source / NATIVE'), false)

  const inspectorPanel = read('components/editor/InspectorPanel.tsx')
  for (const removedText of ['Motion Brain', 'Frame Controls', 'Output frame', 'Canvas format', 'Add source']) {
    assert.equal(inspectorPanel.includes(removedText), false, removedText)
  }
  assert.equal(inspectorPanel.includes('<LiquidFrameSelector'), false)
  assert.equal(inspectorPanel.includes('Refractive Gel Thumb-Track Selector'), false)

  const previewCanvas = read('components/editor/PreviewCanvas.tsx')
  assert.equal(previewCanvas.includes('Transcribing source'), false)
  assert.match(previewCanvas, /<VideoWorkspace/)
  assert.match(previewCanvas, /onPreviewFramePresetChange/)
  assert.match(previewCanvas, /onFitModeChange/)

  const editorHeader = read('components/editor/EditorHeader.tsx')
  assert.equal(editorHeader.includes('ArrowLeft'), false)
  assert.equal(editorHeader.includes('onBack'), false)

  const awwwardsSidebar = read('components/sidebar/AwwwardsSidebar.tsx')
  assert.equal(awwwardsSidebar.includes('ChevronLeft'), false)
  assert.equal(awwwardsSidebar.includes('ChevronRight'), false)
  assert.equal(awwwardsSidebar.includes('Collapse sidebar'), false)
  assert.equal(awwwardsSidebar.includes('Expand sidebar'), false)

  const editorPage = read('app/editor/[id]/page.tsx')
  assert.match(editorPage, /handleEditorHistoryKeyDown/)
  assert.match(editorPage, /event\.altKey/)
  assert.match(editorPage, /event\.key === 'ArrowLeft'/)
  assert.match(editorPage, /event\.key === 'ArrowRight'/)
  assert.match(editorPage, /router\.forward\(\)/)
}

run()
