import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { execSync } from 'node:child_process'

const cwd = process.cwd()
const panelPath = join(cwd, 'components/editor/music-tab-panel.tsx')
const cardPath = join(cwd, 'components/editor/soundtrack-card.tsx')
const panelSource = readFileSync(panelPath, 'utf8')
const cardSource = readFileSync(cardPath, 'utf8')

const flag = process.argv[2]

if (flag === '--check-header') {
  // Title & Subtitle
  assert.ok(panelSource.includes('Music Library'), 'Must render "Music Library" title')
  assert.ok(
    panelSource.includes('Find the perfect soundtrack for your video with AI-curated music.'),
    'Must render subtitle "Find the perfect soundtrack for your video with AI-curated music."',
  )

  // Search input
  assert.ok(
    panelSource.includes('Search title or artist'),
    'Search placeholder must match the music-library reference',
  )

  // Filter chips / pills
  assert.ok(panelSource.includes("label: 'Trending'"), 'Must include "Trending" tab')
  assert.ok(panelSource.includes('Premium'), 'Must include "Premium" tab')
  assert.ok(panelSource.includes('My Music'), 'Must include "My Music" tab')
  assert.ok(panelSource.includes('Favorites'), 'Must include "Favorites" tab')
  assert.ok(
    panelSource.includes('👑') || panelSource.includes('Crown'),
    'Must include crown icon or emoji for Premium',
  )
  assert.ok(
    panelSource.includes('👤') || panelSource.includes('User'),
    'Must include user icon or emoji for My Music',
  )
  assert.ok(
    panelSource.includes('🤍') || panelSource.includes('Heart') || panelSource.includes('♡'),
    'Must include heart icon or emoji for Favorites',
  )

  // Dropdown filter pills
  assert.ok(panelSource.includes('Mood'), 'Must have Mood filter')
  assert.ok(panelSource.includes('Genre'), 'Must have Genre filter')
  assert.ok(panelSource.includes('Duration'), 'Must have Duration filter')

  console.log('music header parity verification passed')
  process.exit(0)
}

if (flag === '--check-left-card') {
  // Trending badge & favorite
  assert.ok(
    panelSource.includes('Trending') && (panelSource.includes('🔥') || panelSource.includes('Flame')),
    'Left card must feature Trending badge with flame emoji/icon',
  )

  // Tags
  assert.ok(
    panelSource.includes('Cinematic') || panelSource.includes('vibeTags') || panelSource.includes('tags'),
    'Left card must render track mood/genre tags',
  )

  // Transport controls
  assert.ok(
    panelSource.includes('Shuffle') || panelSource.includes('shuffle'),
    'Left card must feature shuffle control',
  )
  assert.ok(
    panelSource.includes('SkipBack') || panelSource.includes('handlePrevious'),
    'Left card must feature previous track control',
  )
  assert.ok(
    panelSource.includes('SkipForward') || panelSource.includes('handleNext'),
    'Left card must feature next track control',
  )
  assert.ok(
    panelSource.includes('Repeat') || panelSource.includes('repeat'),
    'Left card must feature repeat control',
  )

  // Volume control inside card
  assert.ok(
    panelSource.includes('Volume') || panelSource.includes('volume'),
    'Left card must feature volume control',
  )

  console.log('music left card parity verification passed')
  process.exit(0)
}

if (flag === '--check-track-table') {
  // Table header
  assert.ok(
    panelSource.includes('Title / Artist') || cardSource.includes('Title / Artist'),
    'Must render "Title / Artist" column header',
  )
  assert.ok(
    panelSource.includes('Genre') || cardSource.includes('Genre'),
    'Must render "Genre" column header',
  )
  assert.ok(
    panelSource.includes('Mood') || cardSource.includes('Mood'),
    'Must render "Mood" column header',
  )
  assert.ok(
    panelSource.includes('Duration') || cardSource.includes('Duration'),
    'Must render "Duration" column header',
  )

  // Row selection & active state checkmark
  assert.ok(
    cardSource.includes('Check') || panelSource.includes('Check'),
    'Track row must render checkmark for active/selected state',
  )
  assert.ok(
    cardSource.includes('Plus') || panelSource.includes('Plus'),
    'Track row must render plus button for unselected state',
  )

  console.log('music track table parity verification passed')
  process.exit(0)
}

if (flag === '--check-bottom-bar') {
  assert.ok(panelSource.includes("compact && 'inset-x-5 flex-nowrap"), 'Now-playing bar must use the compact reference layout')
  assert.ok(panelSource.includes('rounded-b-[13px]'), 'Now-playing bar must retain its progress indicator')
  assert.ok(panelSource.includes('Replace current') && panelSource.includes('Add to timeline'), 'Track actions remain available in the overflow menu')

  console.log('music bottom bar parity verification passed')
  process.exit(0)
}

if (flag === '--check-types') {
  execSync('npx tsc --noEmit', {
    stdio: 'inherit',
    env: { ...process.env, NODE_OPTIONS: '--max-old-space-size=4096' },
  })
  console.log('music typecheck verification passed')
  process.exit(0)
}

console.error('Unknown flag: ' + flag)
process.exit(1)
