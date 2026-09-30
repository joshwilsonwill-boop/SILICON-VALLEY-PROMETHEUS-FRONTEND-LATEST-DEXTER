import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import assert from 'node:assert/strict'

const root = process.cwd()

// 1. Verify creator video catalog & API route
const catalogPath = join(root, 'lib/creators/video-catalog.ts')
assert.ok(existsSync(catalogPath), 'lib/creators/video-catalog.ts must exist')
const catalog = readFileSync(catalogPath, 'utf8')

assert.ok(catalog.includes('Alex Hormozi'), 'Catalog must include Alex Hormozi')
assert.ok(catalog.includes('Leila Hormozi'), 'Catalog must include Leila Hormozi')
assert.ok(catalog.includes('Codie Sanchez'), 'Catalog must include Codie Sanchez')
assert.ok(catalog.includes('Dean Graziosi'), 'Catalog must include Dean Graziosi')
assert.ok(catalog.includes('Dan Martell'), 'Catalog must include Dan Martell')
assert.ok(catalog.includes('Iman Gadzhi'), 'Catalog must include Iman Gadzhi')
assert.ok(catalog.includes('Ray Dalio'), 'Catalog must include Ray Dalio')

const routePath = join(root, 'app/api/creators/videos/route.ts')
assert.ok(existsSync(routePath), 'app/api/creators/videos/route.ts must exist')
const route = readFileSync(routePath, 'utf8')
assert.ok(
  route.includes('YOUTUBE_API_KEY') || route.includes('YOUTUBE_API_KEY_2'),
  'API route must check YouTube API keys'
)
assert.ok(
  route.includes('GET'),
  'API route must export GET handler'
)

// 2. Verify Cinematic Library integration
const libraryPath = join(root, 'components/assets/cinematic-library.tsx')
const library = readFileSync(libraryPath, 'utf8')

assert.ok(
  library.includes('/api/creators/videos') || library.includes('getCreatorVideos') || library.includes('useCreatorVideos'),
  'CinematicLibrary must connect to creator video system'
)
assert.ok(
  library.includes('reticle') || library.includes('cornerBracket') || library.includes('Spotlight') || library.includes('originkit') || library.includes('spotlight'),
  'CinematicLibrary must include Originkit styling / spotlight treatment'
)

console.log('creator videos originkit verification passed')
