import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'

const editor = readFileSync('app/editor/[id]/page.tsx', 'utf8')
const canvas = readFileSync('components/editor/PreviewCanvas.tsx', 'utf8')

test('editor resolves its active preview from the durable final output state', () => {
  assert.match(editor, /useProjectFinalOutput/)
  assert.match(editor, /resolveActivePreview/)
  assert.match(editor, /playableFinalUrl/)
  assert.match(editor, /setFinalOutputView\('final'\)/)
})

test('desktop and mobile editorial chambers expose the same final output controls', () => {
  assert.match(editor, /<FinalOutputControls/)
  assert.match(editor, /finalOutputView/)
  assert.match(canvas, /FinalOutputControls/)
})
