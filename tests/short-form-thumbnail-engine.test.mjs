import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'

console.log('Running Short-Form Thumbnail Studio & Nano Banana regression tests...')

// 1. Check required files exist
assert.ok(existsSync('lib/thumbnails/short-form-styles.ts'), 'short-form-styles.ts must exist')
assert.ok(existsSync('lib/thumbnails/thumbnail-engine.ts'), 'thumbnail-engine.ts must exist')
assert.ok(existsSync('app/api/projects/[id]/thumbnails/nano-banana/route.ts'), 'nano-banana route must exist')
assert.ok(existsSync('components/editor/ThumbnailStudioModal.tsx'), 'ThumbnailStudioModal.tsx must exist')

// 2. Verify short-form archetypes are declared
const stylesSource = readFileSync('lib/thumbnails/short-form-styles.ts', 'utf8')
assert.match(stylesSource, /behind_subject_blueprint/, 'Must declare behind_subject_blueprint archetype')
assert.match(stylesSource, /confessional_gold/, 'Must declare confessional_gold archetype')
assert.match(stylesSource, /script_sans_split/, 'Must declare script_sans_split archetype')
assert.match(stylesSource, /paper_collage_pinup/, 'Must declare paper_collage_pinup archetype')
assert.match(stylesSource, /creator_3d_icons/, 'Must declare creator_3d_icons archetype')
assert.match(stylesSource, /super_confident_script/, 'Must declare super_confident_script archetype')
assert.match(stylesSource, /torn_edge_editorial/, 'Must declare torn_edge_editorial archetype')
assert.match(stylesSource, /mrbeast_grid_contrast/, 'Must declare mrbeast_grid_contrast archetype')

// 3. Verify ThumbnailEngine depth layering & photo treatments
const engineSource = readFileSync('lib/thumbnails/thumbnail-engine.ts', 'utf8')
assert.match(engineSource, /drawBehindHeadline/, 'ThumbnailEngine must implement drawBehindHeadline')
assert.match(engineSource, /drawSpeakerCutout/, 'ThumbnailEngine must implement drawSpeakerCutout')
assert.match(engineSource, /drawFloatingAssets/, 'ThumbnailEngine must implement drawFloatingAssets')
assert.match(engineSource, /drawFilmGrain/, 'ThumbnailEngine must implement drawFilmGrain')
assert.match(engineSource, /drawVignette/, 'ThumbnailEngine must implement drawVignette')
assert.match(engineSource, /drawFringeBlur/, 'ThumbnailEngine must implement drawFringeBlur')
assert.match(engineSource, /drawScriptAccent/, 'ThumbnailEngine must implement drawScriptAccent')

// 3b. Verify subject-aware framing (replaces blind center-crop + fixed ellipse)
assert.match(engineSource, /static detectSubject/, 'ThumbnailEngine must detect the subject region heuristically')
assert.match(engineSource, /ThumbnailEngine\.detectSubject\(img\)/, 'renderThumbnail must run subject detection before cropping')
assert.match(engineSource, /subject\.confidence > 0\.25/, 'Subject-aware crop must respect detection confidence')
assert.match(engineSource, /getImpactFont/, 'Headlines must use a heavy grotesque impact stack, not an editorial serif')
assert.match(engineSource, /accentY/, 'Script accent must position relative to the headline block, not a fixed stamp')

// 4. Verify Nano Banana API route
const nanoRouteSource = readFileSync('app/api/projects/[id]/thumbnails/nano-banana/route.ts', 'utf8')
assert.match(nanoRouteSource, /imagen-3\.0-generateImages/, 'Nano Banana route must connect to Imagen 3 / Gemini Image API')
assert.match(nanoRouteSource, /resolveGeminiApiKey/, 'Nano Banana route must resolve Gemini API key')
assert.match(nanoRouteSource, /SHORT_FORM_ARCHETYPES/, 'Nano Banana route must leverage short-form archetypes')

// 5. Verify ThumbnailStudioModal UI capabilities
const modalSource = readFileSync('components/editor/ThumbnailStudioModal.tsx', 'utf8')
assert.match(modalSource, /SHORT_FORM_ARCHETYPES/, 'Modal must render short-form archetypes')
assert.match(modalSource, /handleGenerateNanoBanana/, 'Modal must support Nano Banana generation')
assert.match(modalSource, /textLayer/, 'Modal must support depth layering control')
assert.match(modalSource, /brandColor/, 'Modal must support brand palette customization')

console.log('short-form-thumbnail-engine: all checks passed successfully!')
