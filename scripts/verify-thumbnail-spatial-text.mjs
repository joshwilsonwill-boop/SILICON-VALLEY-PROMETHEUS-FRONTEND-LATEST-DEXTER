import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const root = process.cwd()
const modalSource = readFileSync(join(root, 'components/editor/ThumbnailStudioModal.tsx'), 'utf8')

console.log('Verifying spatial 9-point text placement, dual-script typography & archetypes...')

// 1. Modal must feature 9-point spatial matrix or spatial placement selector
assert.match(modalSource, /SPATIAL_POSITIONS|spatialMatrix|spatialPoint|grid-cols-3/i, 'Modal must declare 9-point spatial placement grid')

// 2. Modal must provide dual-script typography stacking (headline + cursive script accent)
assert.match(modalSource, /headline/, 'Modal must control headline')
assert.match(modalSource, /scriptAccent/, 'Modal must control scriptAccent')
assert.match(modalSource, /fontSizeScale/, 'Modal must provide font size scaling')

// 3. Modal must provide depth layering control (behind speaker, foreground, split)
assert.match(modalSource, /textLayer/, 'Modal must control depth layering')
assert.match(modalSource, /behind|foreground|split/, 'Modal must support behind, foreground, split layer modes')

// 4. Modal must showcase short-form archetypes with high-tier styling
assert.match(modalSource, /SHORT_FORM_ARCHETYPES/, 'Modal must render short-form archetypes')
assert.match(modalSource, /handleSelectArchetype/, 'Modal must handle archetype selection')

// 5. Modal must support Multimodal Nano Banana Style-Lock AI
assert.match(modalSource, /handleGenerateNanoBanana/, 'Modal must support Nano Banana generation')

console.log('thumbnail-spatial-text-verified')
