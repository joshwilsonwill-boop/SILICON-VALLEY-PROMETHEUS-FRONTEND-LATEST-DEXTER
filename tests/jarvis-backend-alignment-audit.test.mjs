import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'

console.log('Running Jarvis Backend Alignment Audit Test...')

const backendPath = 'c:/users/homepc/downloads/prometheus-vincere-backend/mini_run_pipeline'
assert.ok(existsSync(backendPath), 'Backend mini_run_pipeline directory must exist')

// 1. Verify backend song_program exists and inspect track IDs
const songProgramSource = readFileSync(`${backendPath}/song_program.py`, 'utf8')
assert.match(songProgramSource, /BUILTIN_SANCTIONED_TRACKS/, 'Backend must define BUILTIN_SANCTIONED_TRACKS')
assert.match(songProgramSource, /music-preview-cinematic-trailer-epic-intense-trailer/, 'Backend must have intense trailer track')

// 2. Verify backend orchestration zoom archetypes
const orchSource = readFileSync(`${backendPath}/orchestration.py`, 'utf8')
assert.match(orchSource, /ZOOM_KINDS/, 'Backend orchestration must define ZOOM_KINDS')
assert.match(orchSource, /joseph_edit/, 'Backend must define joseph_edit zoom')
assert.match(orchSource, /punch_zoom/, 'Backend must define punch_zoom')

// 3. Verify frontend song intelligence aligns with backend tracks
const { SANCTIONED_MUSIC_CATALOG } = await import('../lib/autonomous-ui/song-intelligence.ts')
const hasTrailerTrack = SANCTIONED_MUSIC_CATALOG.some(
  (t) => t.id === 'music-preview-cinematic-trailer-epic-intense-trailer'
)
assert.ok(hasTrailerTrack, 'Frontend catalog must include backend sanctioned intense trailer track')

// 4. Verify frontend timeline document supports backend zoom kinds
const { ZOOM_ARCHETYPES } = await import('../lib/editor/timeline-document.ts')
assert.ok(ZOOM_ARCHETYPES.includes('joseph_edit'), 'Frontend must support joseph_edit')
assert.ok(ZOOM_ARCHETYPES.includes('smooth_zoom_in'), 'Frontend must support smooth_zoom_in')
assert.ok(ZOOM_ARCHETYPES.includes('punch_zoom'), 'Frontend must support punch_zoom')

console.log('jarvis-backend-alignment-audit: all checks passed')
