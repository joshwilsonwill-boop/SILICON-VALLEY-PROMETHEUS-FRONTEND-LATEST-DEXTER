import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import assert from 'node:assert/strict'

const file = join(process.cwd(), 'components/editor/motion-edit-workspace.tsx')
const content = readFileSync(file, 'utf8')

// 1. Revert from faded blue to black
assert.ok(
  !content.includes('#101a2b'),
  'Motion chamber must not contain #101a2b faded blue background'
)
assert.ok(
  !content.includes('#080d17'),
  'Motion chamber must not contain #080d17 faded blue surfaces'
)
assert.ok(
  !content.includes('#29486c'),
  'Motion chamber must not contain #29486c blue borders'
)
assert.ok(
  !content.includes('rgba(98,172,255'),
  'Motion chamber dot grid must not contain blue-tinted rgba(98,172,255'
)
assert.ok(
  !content.includes('via-[#4d9dff]/70'),
  'Motion chamber top accent must not contain via-[#4d9dff]/70'
)

// 2. Retain special canvas treatment (dots grid, canvas chamber attributes)
assert.ok(
  content.includes('data-motion-chamber'),
  'Motion chamber must retain data-motion-chamber container'
)
assert.ok(
  content.includes('bg-[radial-gradient(circle_at_50%_50%'),
  'Motion chamber must retain the special canvas dot grid pattern'
)
assert.ok(
  content.includes('rgba(255,255,255'),
  'Motion chamber must use the clean monochrome canvas grid'
)
assert.ok(
  content.includes('bg-[radial-gradient(ellipse_at_50%_42%,#080808_0%,#000_68%)]') ||
  content.includes('bg-black'),
  'Motion chamber must use the black gradient background'
)

console.log('motion chamber black reversion passed')
