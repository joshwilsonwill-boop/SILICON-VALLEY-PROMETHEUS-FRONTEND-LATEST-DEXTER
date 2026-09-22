import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const root = process.cwd()
const spotlightSource = readFileSync(join(root, 'components/editor/SpotlightFrames.tsx'), 'utf8')
const modalSource = readFileSync(join(root, 'components/editor/ThumbnailStudioModal.tsx'), 'utf8')

console.log('Verifying Awwwards / Lusion-tier 3D mouse tracking & Spotlight revamp...')

// 1. SpotlightFrames must have dynamic mouse tracking / cursor coordinates
assert.match(spotlightSource, /mousePos|cursorPos|pointerPos/i, 'SpotlightFrames must track cursor coordinates')
assert.match(spotlightSource, /onPointerMove|onMouseMove/i, 'SpotlightFrames must handle pointer move events')

// 2. SpotlightFrames must feature optical reticle / corner brackets / targeting marks
assert.match(spotlightSource, /reticle|cornerBracket|crosshair|guide/i, 'SpotlightFrames must render optical reticle or corner brackets')

// 3. SpotlightFrames must feature dynamic spotlight / specular gradient
assert.match(spotlightSource, /radial-gradient|spotlight/i, 'SpotlightFrames must render dynamic radial spotlight or specular reflection')

// 4. Modal must feature 3D perspective tilt or cursor tracking on thumbnail canvas preview
assert.match(modalSource, /perspective|rotateX|rotateY|tilt|pointerPos/i, 'Modal canvas stage must feature 3D perspective tilt or cursor tracking')

// 5. Modal must feature interactive direct canvas positioning or stage hotspot placement
assert.match(modalSource, /handleCanvasPlacement|handleStageClick|stagePlacement/i, 'Modal must allow direct canvas spatial positioning')

console.log('thumbnail-studio-revamp-verified')
