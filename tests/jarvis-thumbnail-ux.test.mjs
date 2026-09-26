import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const jarvis = readFileSync('components/navigation/jarvis-top-nav-filament.tsx', 'utf8')
const hud = readFileSync('components/editor/voice-companion-hud.tsx', 'utf8')
const dock = readFileSync('components/ui/dock.tsx', 'utf8')
const studio = readFileSync('components/editor/ThumbnailStudioModal.tsx', 'utf8')
const route = readFileSync('app/api/projects/[id]/thumbnails/nano-banana/route.ts', 'utf8')

assert.equal((jarvis.match(/<DockItem/g) ?? []).length, 3)
assert.doesNotMatch(jarvis, /<Radio|Editor Linked|Hotspots Takeover/)
assert.match(jarvis, /onClick={companion\.toggleMute}/)
assert.match(jarvis, /Allow Jarvis to edit/)
assert.match(jarvis, /companion\.disconnect/)
assert.match(jarvis, /<DockLabel>/)
assert.doesNotMatch(hud, /toggleVision|Vision Synchronized|<Eye/)
assert.doesNotMatch(dock, /aria-haspopup="true"/)

assert.match(studio, /id="thumbnail-headline"/)
assert.match(studio, /id="thumbnail-recipe"/)
assert.match(studio, /id="thumbnail-direction"/)
assert.match(studio, /Style references/)
assert.match(studio, /Generate with Nano Banana/)
assert.match(studio, /const currentDisplayUrl = generatedDataUrl \?\? previewDataUrl/)
assert.doesNotMatch(studio, /TIME MANAGEMENT/)
assert.match(studio, /const activeUrl = generatedDataUrl/g)
assert.match(studio, /disabled={!generatedDataUrl}/)
assert.match(studio, /body: JSON\.stringify\(\{ thumbnailUrl: activeUrl \}\)/)
assert.match(route, /buildNanoBananaImageRequest/)
assert.match(route, /extractGeneratedImage/)
assert.doesNotMatch(route, /nano_banana_spec|imagen-3\.0-generateImages/)

console.log('jarvis-thumbnail-ux passed')
