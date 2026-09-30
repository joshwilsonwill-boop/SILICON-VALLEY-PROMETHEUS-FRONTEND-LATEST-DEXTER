import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const root = process.cwd()
const read = (relativePath) => readFileSync(join(root, relativePath), 'utf8')
const runNode = (script) => execFileSync(process.execPath, [script], { cwd: root, stdio: 'inherit' })

function verifyToolbar() {
  const viewport = read('components/editor/editorial-timeline-viewport.tsx')
  const workspace = read('components/editor/motion-edit-workspace.tsx')
  const combined = viewport + '\n' + workspace

  // Check NLE toolbar controls from 9103 reference
  const requiredPatterns = [
    /pointer|cursor|select/i,
    /scissors|split|razor/i,
    /undo/i,
    /redo/i,
    /trash|delete/i,
    /copy|duplicate/i,
    /magnet|snap/i,
    /zoom/i,
    /tabular-nums|font-mono/i,
  ]

  for (const pattern of requiredPatterns) {
    if (!pattern.test(combined)) {
      throw new Error(`Toolbar verification failed: missing pattern ${pattern}`)
    }
  }

  runNode('tests/editorial-timeline-clone.test.mjs')
  console.log('editorial timeline toolbar verification passed')
}

function verifyHeaders() {
  const tracks = read('components/editor/editorial-timeline-tracks.tsx')
  const viewport = read('components/editor/editorial-timeline-viewport.tsx')
  const combined = tracks + '\n' + viewport

  // Check track headers: Video (eye, lock), Audio (eye, mute), Captions (CC, eye), Music (note, eye), + Add track
  const headerPatterns = [
    /Video/i,
    /Audio/i,
    /Captions/i,
    /Music/i,
    /Add track/i,
    /lock/i,
    /eye/i,
  ]

  for (const pattern of headerPatterns) {
    if (!pattern.test(combined)) {
      throw new Error(`Track headers verification failed: missing pattern ${pattern}`)
    }
  }

  runNode('tests/editorial-timeline-clone.test.mjs')
  console.log('editorial timeline headers verification passed')
}

function verifyVideoClips() {
  const tracks = read('components/editor/editorial-timeline-tracks.tsx')

  // Check separable clips, thumbnails, selection border, trim handles, B-roll badge
  const clipPatterns = [
    /separable|clips|clip/i,
    /thumbnails|thumbnail/i,
    /9df65a/i, // neon green selection accent
    /handle|trim/i,
    /B-roll|b-roll/i,
  ]

  for (const pattern of clipPatterns) {
    if (!pattern.test(tracks)) {
      throw new Error(`Video clips verification failed: missing pattern ${pattern}`)
    }
  }

  runNode('tests/editorial-timeline-clone.test.mjs')
  console.log('editorial timeline video clips verification passed')
}

function verifyAudioCurve() {
  const tracks = read('components/editor/editorial-timeline-tracks.tsx')
  const combined = tracks

  // Check Voice (Enhanced), waveform, automation curve/keyframes, Whoosh SFX clip
  const audioPatterns = [
    /Voice \(Enhanced\)|Voice/i,
    /waveform/i,
    /keyframe|curve|envelope/i,
    /Whoosh|whoosh/i,
  ]

  for (const pattern of audioPatterns) {
    if (!pattern.test(combined)) {
      throw new Error(`Audio curve and SFX verification failed: missing pattern ${pattern}`)
    }
  }

  runNode('tests/editorial-timeline-clone.test.mjs')
  console.log('editorial timeline audio curve verification passed')
}

function verifyCaptions() {
  const tracks = read('components/editor/editorial-timeline-tracks.tsx')

  // Check transcript caption pills, seek interaction, active highlight
  const captionPatterns = [
    /transcriptSegments|captions/i,
    /rounded/i,
    /onSeek/i,
  ]

  for (const pattern of captionPatterns) {
    if (!pattern.test(tracks)) {
      throw new Error(`Captions track verification failed: missing pattern ${pattern}`)
    }
  }

  runNode('tests/editorial-timeline-clone.test.mjs')
  console.log('editorial timeline captions verification passed')
}

function verifyMusicSync() {
  const tracks = read('components/editor/editorial-timeline-tracks.tsx')
  const soundtrack = read('components/editor/motion/motion-soundtrack-track.tsx')
  const workspace = read('components/editor/motion-edit-workspace.tsx')
  const combined = tracks + '\n' + soundtrack + '\n' + workspace

  // Check music reflection, title, waveform, fade curves, fallback sync button
  const musicPatterns = [
    /selectedMusicTrack/i,
    /waveform/i,
    /fade|curve/i,
    /Sync soundtrack to motion/i,
  ]

  for (const pattern of musicPatterns) {
    if (!pattern.test(combined)) {
      throw new Error(`Music track sync verification failed: missing pattern ${pattern}`)
    }
  }

  runNode('tests/editorial-timeline-clone.test.mjs')
  console.log('editorial timeline music sync verification passed')
}

function verifyRegressions() {
  runNode('tests/editorial-timeline-clone.test.mjs')
  runNode('tests/motion-workspace-layout-regression.test.mjs')
  console.log('editorial timeline regressions passed')
}

const mode = process.argv[2]
if (mode === '--toolbar') verifyToolbar()
else if (mode === '--headers') verifyHeaders()
else if (mode === '--video-clips') verifyVideoClips()
else if (mode === '--audio-curve') verifyAudioCurve()
else if (mode === '--captions') verifyCaptions()
else if (mode === '--music-sync') verifyMusicSync()
else if (mode === '--regressions') verifyRegressions()
else throw new Error('Expected --toolbar, --headers, --video-clips, --audio-curve, --captions, --music-sync, or --regressions')
