import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const root = process.cwd()
const read = (path) => readFileSync(join(root, path), 'utf8')

const tracks = read('components/editor/editorial-timeline-tracks.tsx')
const viewport = read('components/editor/editorial-timeline-viewport.tsx')
const toolbar = read('components/editor/editorial-timeline-toolbar.tsx')
const workspace = read('components/editor/motion-edit-workspace.tsx')
const combined = tracks + '\n' + viewport + '\n' + toolbar + '\n' + workspace

// 1. Toolbar validation matching 9103 Reference
assert.match(toolbar, /MousePointer2|Selection Tool/i, 'Selection tool present in toolbar')
assert.match(toolbar, /Scissors|split-clip/i, 'Razor/split tool present in toolbar')
assert.match(toolbar, /Undo2|undo/i, 'Undo tool present in toolbar')
assert.match(toolbar, /Redo2|redo/i, 'Redo tool present in toolbar')
assert.match(toolbar, /Trash2|delete-clip/i, 'Delete tool present in toolbar')
assert.match(toolbar, /Copy|duplicate-clip/i, 'Duplicate tool present in toolbar')
assert.match(toolbar, /Magnet|snapping/i, 'Magnet/snapping tool present in toolbar')
assert.match(toolbar, /ZoomOut/i, 'ZoomOut control present in toolbar')
assert.match(toolbar, /ZoomIn/i, 'ZoomIn control present in toolbar')
assert.match(toolbar, /formatTimecode|tabular-nums/i, 'Tabular timecode display present in toolbar')

// 2. Track headers validation
assert.match(viewport, />\s*Video\s*</i, 'Video track header label present')
assert.match(viewport, />\s*Audio\s*</i, 'Audio track header label present')
assert.match(viewport, />\s*Captions\s*</i, 'Captions track header label present')
assert.match(viewport, />\s*Music\s*</i, 'Music track header label present')
assert.match(viewport, /Add track/i, 'Add track button present below music header')
assert.match(viewport, /EyeOff|Eye/i, 'Track visibility toggles present in headers')
assert.match(viewport, /Lock|Unlock/i, 'Video lock toggle present in header')
assert.match(viewport, /VolumeX|Volume2/i, 'Audio mute toggle present in header')

// 3. Separable video clips & neon selection
assert.match(tracks, /internalClips|clips/i, 'Video clips structure present')
assert.match(tracks, /9df65a/i, 'Neon lime-green selection accent present')
assert.match(tracks, /trim-left|trim-right/i, 'Trim handles present on selected clip')
assert.match(tracks, /B-roll/i, 'B-roll clip badge present')
assert.match(tracks, /useEditorialTimelineThumbnails/i, 'Video filmstrip thumbnails integrated')

// 4. Audio Track: Voice waveform + Automation curve + Whoosh SFX
assert.match(tracks, /Voice \(Enhanced\)/i, 'Voice (Enhanced) emerald badge present')
assert.match(tracks, /voiceWaveBars|waveform/i, 'Voice audio waveform present')
assert.match(tracks, /<path[^>]+stroke="#5eead4"/i, 'Audio automation ducking curve path present')
assert.match(tracks, /circle[^>]+cx="160"/i, 'Audio automation keyframe node handles present')
assert.match(tracks, /aria-label="Audio Track"/i, 'Original audio lane is present')

// 5. Captions track: Separable pills & seek
assert.match(tracks, /resolvedCaptions|transcriptSegments/i, 'Captions data mapped')
assert.match(tracks, /rounded-md/i, 'Rounded capsule pills used for captions')
assert.match(tracks, /onSeek/i, 'Seeking capability wired to caption pills')

// 6. Music track sync
assert.match(tracks, /selectedMusicTrack/i, 'Music track reflects selected track')
assert.match(tracks, /fade-in|#c084fc|curve/i, 'Music volume fade automation curve present')
assert.match(tracks, /Sync soundtrack to motion/i, 'Empty music fallback present')

// 7. Playhead
assert.match(viewport, /data-editorial-playhead/i, 'Playhead line element present')

console.log('editorial-timeline-clone unit assertions passed')
