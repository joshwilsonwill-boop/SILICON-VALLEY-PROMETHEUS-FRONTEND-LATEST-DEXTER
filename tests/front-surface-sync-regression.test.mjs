import assert from 'node:assert/strict'
import { existsSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

const root = process.cwd()
const read = (relativePath) => readFileSync(join(root, relativePath), 'utf8')

const styleSource = read('lib/styles/style-templates.ts')
const previewMatches = [...styleSource.matchAll(/previewImages:\s*\['([^']+)'/g)].map((match) => match[1])
assert.equal(previewMatches.length, 8, 'All eight style templates need a primary preview')
assert.equal(new Set(previewMatches).size, previewMatches.length, 'Primary style previews must be unique')
for (const publicPath of previewMatches) {
  const filePath = join(root, 'public', publicPath.replace(/^\//, ''))
  assert.ok(existsSync(filePath), `Missing style preview: ${publicPath}`)
  assert.ok(statSync(filePath).size > 20_000, `Style preview is empty or too small: ${publicPath}`)
}

const stylesSheet = read('components/video-upload-interface.tsx')
assert.match(stylesSheet, /data-style-template=/, 'Style rows need a stable visual-test selector')
assert.match(stylesSheet, /aspect-video/, 'Style thumbnails must preserve their 16:9 composition')
assert.match(stylesSheet, /template\.previewImages/, 'Local style previews must remain the offline fallback')

const library = read('components/assets/cinematic-library.tsx')
assert.match(library, /FOUNDER_ARCHIVE_PROFILES/, 'Creator archive profiles must be present')
assert.match(library, /onError=.*setImageFailed/s, 'Archive cards need a visible image fallback')
assert.match(library, /fetchPriority=/, 'Above-the-fold creator art should be requested eagerly')
for (const image of [
  'public/library/alex-hormozi/hero.jpg',
  'public/library/alex-hormozi/behind-scenes.jpg',
  'public/library/alex-hormozi/offers.jpg',
  'public/library/alex-hormozi/sales.jpg',
  'public/library/alex-hormozi/consistency.jpg',
  'public/library/alex-hormozi/keynote.jpg',
  'public/library/alex-hormozi/business-2026.jpg',
]) {
  assert.ok(existsSync(join(root, image)), `Missing creator library image: ${image}`)
  assert.ok(statSync(join(root, image)).size > 15_000, `Creator library image is empty: ${image}`)
}

const assetsPage = read('app/assets/page.tsx')
assert.match(assetsPage, /snap-y snap-proximity/, 'Assets page must use non-trapping snap behavior')
assert.doesNotMatch(assetsPage, /snap-y snap-mandatory/, 'Mandatory snap creates an inaccessible scroll trap')

const music = read('components/editor/music-tab-panel.tsx')
assert.match(music, /key="editor-music-tab-panel"[\s\S]*?relative flex h-full min-h-0/, 'Desktop Music must occupy the same bounded workspace as Motion')
assert.doesNotMatch(music, /#6366f1|#818cf8|#5558e8/, 'Music must not keep the old indigo interaction palette')
assert.match(music, /#4d9dff|#3288ee/, 'Music must use the editorial-blue interaction accent')

const editorPage = read('app/editor/[id]/page.tsx')
assert.match(editorPage, /overflow-y-auto overflow-x-hidden lg:overflow-hidden/, 'Editor must prevent horizontal page scrolling')

console.log('front surface sync regression checks passed')
