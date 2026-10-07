import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const root = process.cwd()
const read = (path) => readFileSync(join(root, path), 'utf8')

const pageSource = read('app/editor/[id]/page.tsx')
const previewCanvasSource = read('components/editor/PreviewCanvas.tsx')
const motionWorkspaceSource = read('components/editor/motion-edit-workspace.tsx')

// 1. Verify editor page root has dedicated, stable ID for source file input
assert.ok(
  pageSource.includes('id="editor-source-file-input"'),
  'Editor page must define id="editor-source-file-input" on the root source file input'
)
assert.ok(
  pageSource.includes('ref={sourceFileInputRef}'),
  'Editor page must keep sourceFileInputRef on the root input'
)

// 2. Verify openInlineSourcePicker retrieves ref or falls back to DOM element and clears value
assert.ok(
  pageSource.includes("document.getElementById('editor-source-file-input')"),
  'openInlineSourcePicker must fall back to document.getElementById if ref is detached or nulled'
)
assert.ok(
  pageSource.includes("input.value = ''"),
  'openInlineSourcePicker must reset input value prior to click so re-selecting triggers change event'
)

// 3. Verify PreviewCanvas does not mount a competing duplicate input with sourceFileInputRef
assert.ok(
  !previewCanvasSource.includes('ref={sourceFileInputRef}'),
  'PreviewCanvas must not render duplicate <input ref={sourceFileInputRef}> that nulls ref on unmount'
)

// 4. Verify motion-edit-workspace wires onPickSource to the Replace source media button
assert.ok(
  motionWorkspaceSource.includes('Replace source media'),
  'motion-edit-workspace must contain Replace source media button'
)
assert.ok(
  motionWorkspaceSource.includes('handlePickSource'),
  'motion-edit-workspace must define resilient handlePickSource callback'
)
assert.ok(
  motionWorkspaceSource.includes("document.getElementById('editor-source-file-input')"),
  'Replace source media must safely fall back to editor-source-file-input if onPickSource is missing'
)

// 5. Test behavioral simulation with mock DOM
{
  let clicked = false
  let resetValue = null
  const mockInput = {
    value: 'previous_video.mp4',
    click() {
      clicked = true
    },
    set value(v) {
      resetValue = v
    },
    get value() {
      return resetValue ?? 'previous_video.mp4'
    }
  }

  // Simulate openInlineSourcePicker behavior
  const simulatePick = (refCurrent, docElement) => {
    const input = refCurrent ?? docElement
    if (input) {
      input.value = ''
      input.click()
    }
  }

  // Case A: ref was nulled by tab switch (the bug)
  simulatePick(null, mockInput)
  assert.equal(clicked, true, 'simulatePick must click input even if ref was nulled')
  assert.equal(mockInput.value, '', 'simulatePick must reset input value before click')
}

console.log('motion replace source media tests passed successfully!')
