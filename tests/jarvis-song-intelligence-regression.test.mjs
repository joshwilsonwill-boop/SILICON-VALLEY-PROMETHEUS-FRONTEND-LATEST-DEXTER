import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'

console.log('Running Jarvis Song Intelligence Regression Test...')

// 1. Song intelligence module must exist
assert.ok(existsSync('lib/autonomous-ui/song-intelligence.ts'), 'lib/autonomous-ui/song-intelligence.ts must exist')

// 2. Must export catalog and scoring algorithm
const { scoreSongCandidates, SANCTIONED_MUSIC_CATALOG, getBestMatchingTrack } = await import('../lib/autonomous-ui/song-intelligence.ts')
assert.ok(Array.isArray(SANCTIONED_MUSIC_CATALOG), 'SANCTIONED_MUSIC_CATALOG must be an array')
assert.ok(SANCTIONED_MUSIC_CATALOG.length >= 3, 'Must contain multiple sanctioned tracks')

// Verify track schema matches backend song_program capabilities
const firstTrack = SANCTIONED_MUSIC_CATALOG[0]
assert.ok(firstTrack.id, 'Track must have id')
assert.ok(firstTrack.title, 'Track must have title')
assert.ok(Array.isArray(firstTrack.genreTags), 'Track must have genreTags')
assert.ok(Array.isArray(firstTrack.moodTags), 'Track must have moodTags')

// 3. Test intelligent scoring for "cinematic"
const cinematicMatches = scoreSongCandidates('cinematic intense trailer', {
  transcript: 'In this high stakes video we take our company to the next level.',
  pace: 'fast',
})
assert.ok(cinematicMatches.length > 0, 'Must return scored candidates')
assert.match(cinematicMatches[0].track.title.toLowerCase(), /trailer|cinematic|intense/, 'Top match for cinematic prompt must be a cinematic track')

// 4. Check coordinator.ts dispatches real input and value to search input
const coordinatorSource = readFileSync('lib/autonomous-ui/coordinator.ts', 'utf8')
assert.match(coordinatorSource, /searchTarget\.element\.value\s*=/, 'coordinator must assign value to search input')
assert.match(coordinatorSource, /dispatchEvent\(new Event\('input'/, 'coordinator must dispatch input event on search element')
assert.match(coordinatorSource, /scoreSongCandidates|getBestMatchingTrack/, 'coordinator must incorporate song scoring/recommendation')

// 5. Check gemini-live-client.ts tools include music recommendation intelligence
const liveClientSource = readFileSync('lib/voice-companion/gemini-live-client.ts', 'utf8')
assert.match(liveClientSource, /autonomous_music_action/, 'gemini-live-client must declare autonomous_music_action')
assert.match(liveClientSource, /recommend_soundtrack|intelligent_music_select|video-aware|curate/i, 'gemini-live-client must describe intelligent music recommendation')

console.log('jarvis-song-intelligence-regression: all checks passed')
