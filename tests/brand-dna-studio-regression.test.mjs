import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const root = process.cwd()
const read = (relativePath) => readFileSync(join(root, relativePath), 'utf8')

// 1. Check BrandDnaStudio component implementation
const studio = read('components/assets/brand-dna-studio.tsx')
assert.match(studio, /export function BrandDnaStudio/, 'Must export BrandDnaStudio component')
assert.match(studio, /PRESET_BRANDS/, 'Must include curated brand archetypes')
assert.match(studio, /BRAND_DNA_STORAGE_KEY/, 'Must include storage key for persistence')

// Verify curated archetypes
assert.match(studio, /Linear/, 'Must include Linear archetype')
assert.match(studio, /A24 Films/, 'Must include A24 Films archetype')
assert.match(studio, /Acquired Podcast/, 'Must include Acquired Podcast archetype')
assert.match(studio, /Stripe/, 'Must include Stripe archetype')
assert.match(studio, /Hermès/, 'Must include Hermès archetype')

// Verify URL extraction omnibar & Google Pomelli kernel
assert.match(studio, /Google Pomelli Extraction Engine|OPEN-POMELLI KERNEL/, 'Must reference Pomelli engine')
assert.match(studio, /inputUrl/, 'Must maintain interactive input URL state')
assert.match(studio, /Extract DNA/, 'Must include Extract DNA action button')
assert.match(studio, /scanStep/, 'Must include multi-step scanning simulation')

// Verify 5 core brand tabs & bento panels
assert.match(studio, /01\. Brand Identity/, 'Must include Brand Identity tab')
assert.match(studio, /02\. Spectral Palette/, 'Must include Spectral Palette tab')
assert.match(studio, /03\. Typography Architecture/, 'Must include Typography Architecture tab')
assert.match(studio, /04\. Voice & Persona Radar/, 'Must include Voice & Persona Radar tab')
assert.match(studio, /05\. Creative Video Mockups/, 'Must include Creative Video Mockups tab')

// Verify multi-platform formats from Open-Pomelli
assert.match(studio, /9:16 Kinetic Short \/ Reel/, 'Must support 9:16 format')
assert.match(studio, /1:1 Square Editorial Post/, 'Must support 1:1 format')
assert.match(studio, /16:9 Cinematic Video Banner/, 'Must support 16:9 format')
assert.match(studio, /4:5 Feed Portrait/, 'Must support 4:5 format')

// Verify 9-point grid alignment
assert.match(studio, /gridPosition/, 'Must maintain 9-point alignment grid state')

// Verify suite export and persistence
assert.match(studio, /Apply To Video Suite/, 'Must provide Apply To Video Suite action')
assert.match(studio, /saveJarvisMemory/, 'Must sync brand taste to Jarvis persistent memory')
assert.match(studio, /Export DNA Tokens \(\.JSON\)/, 'Must provide JSON export functionality')

// 2. Check 3-Layer Scrolling in AssetsPage
const assetsPage = read('app/assets/page.tsx')
assert.match(assetsPage, /import \{ BrandDnaStudio \} from '@\/components\/assets\/brand-dna-studio'/, 'Must import BrandDnaStudio')
assert.match(assetsPage, /snap-y snap-mandatory/, 'Must maintain snap-y snap-mandatory scroll container')

// Ensure order: LibraryCollection -> BrandCanvas -> BrandDnaStudio
const libraryIdx = assetsPage.indexOf('<LibraryCollection')
const brandCanvasIdx = assetsPage.indexOf('<BrandCanvas')
const brandDnaStudioIdx = assetsPage.indexOf('<BrandDnaStudio')

assert.ok(libraryIdx !== -1, 'LibraryCollection must be present')
assert.ok(brandCanvasIdx !== -1, 'BrandCanvas must be present')
assert.ok(brandDnaStudioIdx !== -1, 'BrandDnaStudio must be present')
assert.ok(libraryIdx < brandCanvasIdx, 'LibraryCollection must precede BrandCanvas')
assert.ok(brandCanvasIdx < brandDnaStudioIdx, 'BrandCanvas must precede BrandDnaStudio (Layer 2 -> Layer 3)')

// Verify snap classes on sections
const library = read('components/assets/library-collection.tsx')
assert.match(library, /snap-start snap-always/, 'Layer 1 must have snap-start snap-always')
const canvas = read('components/assets/brand-canvas.tsx')
assert.match(canvas, /snap-start snap-always/, 'Layer 2 must have snap-start snap-always')
assert.match(studio, /snap-start snap-always/, 'Layer 3 must have snap-start snap-always')

console.log('brand dna studio regression checks passed successfully!')
