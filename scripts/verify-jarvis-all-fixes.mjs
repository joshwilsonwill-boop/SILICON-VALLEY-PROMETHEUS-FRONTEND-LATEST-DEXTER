import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const gate = process.argv.includes('--gate') ? process.argv[process.argv.indexOf('--gate') + 1] : 'all'

console.log(`[verify-jarvis-all-fixes] Verifying gate: ${gate}`)

if (gate === 'G1' || gate === 'all') {
  console.log('--- Testing G1: Multi-tier duration resolution ---')
  const pageSource = readFileSync('app/editor/[id]/page.tsx', 'utf8')
  assert.ok(pageSource.includes('transcriptDurationMs'), 'Must calculate transcriptDurationMs')
  assert.ok(pageSource.includes('sourceMetricsDurationSec'), 'Must calculate sourceMetricsDurationSec')
  assert.match(pageSource, /previewDurationSec > 0\s*\?\s*previewDurationSec\s*:\s*totalDurationMs > 0/, 'Must fall back from previewDurationSec to totalDurationMs')
  
  // Test hook fallback
  const hookSource = readFileSync('hooks/use-voice-companion.ts', 'utf8')
  assert.match(hookSource, /Math\.max\(\.\.\.rawSegments\.map\(/, 'use-voice-companion must estimate duration from transcript segments if durationSec <= 0')
  console.log('G1_DURATION_RESOLUTION_PASSED')
}

if (gate === 'G2' || gate === 'all') {
  console.log('--- Testing G2: MobileEditorView reactivity & display ---')
  const pageSource = readFileSync('app/editor/[id]/page.tsx', 'utf8')
  assert.ok(!pageSource.includes("const activeTab = 'status' as MobileEditorTabKey"), 'activeTab must not be a hardcoded static string')
  assert.match(pageSource, /const \[activeTab, setActiveTab\] = React\.useState<MobileEditorTabKey>/, 'activeTab must be reactive state')
  assert.ok(pageSource.includes('renderTabContent()'), 'MobileEditorView must render tab content')
  assert.match(pageSource, /externalVideoRef=\{motionVideoRef\}/, 'MobileVideoPlayer must receive motionVideoRef')
  assert.match(pageSource, /onLoadedMetadata=\{onVideoLoadedMetadata\}/, 'MobileVideoPlayer must trigger onVideoLoadedMetadata')
  console.log('G2_MOBILE_EDITOR_PASSED')
}

if (gate === 'G3' || gate === 'all') {
  console.log('--- Testing G3: Music random & offline fallback ---')
  const { performVoiceMusicAction } = await import('../lib/voice-companion/music-controls.ts')
  
  // 1. Random track selection with offline catalog
  const randomResult = await performVoiceMusicAction({
    action: 'select',
    query: 'random track',
  }, () => ({
    getMusicCatalog: () => [],
    onTabChange: async () => {},
    onSelectMusicTrack: async () => ({ success: true, staged: true, summary: 'Staged' }),
    getActiveWorkspaceTab: () => 'Music',
  }))
  assert.ok(randomResult.success, 'Random track selection must succeed with bundled catalog fallback')
  assert.ok(randomResult.staged, 'Track must be staged')
  assert.ok(randomResult.title, 'Selected track must have a title')

  // 2. Mood-based selection (solemn track)
  const solemnResult = await performVoiceMusicAction({
    action: 'select',
    query: 'solemn background music',
  }, () => ({
    getMusicCatalog: () => [],
    onTabChange: async () => {},
    onSelectMusicTrack: async () => ({ success: true, staged: true, summary: 'Staged' }),
    getActiveWorkspaceTab: () => 'Music',
  }))
  assert.ok(solemnResult.success, 'Solemn track query must succeed')
  assert.ok(solemnResult.staged, 'Solemn track must be staged')
  console.log('G3_MUSIC_FALLBACK_PASSED')
}

if (gate === 'G4' || gate === 'all') {
  console.log('--- Testing G4: Decoupled Thumbnail Generation ---')
  const hookSource = readFileSync('hooks/use-voice-companion.ts', 'utf8')
  assert.match(hookSource, /case 'create_video_thumbnail':/, 'create_video_thumbnail must exist in tool handler')
  assert.match(hookSource, /titleHint/, 'create_video_thumbnail must provide title fallback')
  assert.match(hookSource, /open_thumbnail_studio/, 'create_video_thumbnail must dispatch open_thumbnail_studio action')
  
  const liveClientSource = readFileSync('lib/voice-companion/gemini-live-client.ts', 'utf8')
  assert.ok(liveClientSource.includes('create_video_thumbnail'), 'Live client must register create_video_thumbnail tool')
  assert.ok(liveClientSource.includes('NEVER claim thumbnail creation is an unavailable feature'), 'Live client instructions must forbid thumbnail unavailability claims')
  console.log('G4_THUMBNAIL_GENERATION_PASSED')
}

if (gate === 'G5' || gate === 'all') {
  console.log('--- Testing G5: B-roll & Motion Graphics Support ---')
  const { buildEditorialPlan } = await import('../lib/editor/timeline-document.ts')
  const plan = buildEditorialPlan('Add B rolls and motion graphics to this video', {
    durationSec: 30,
    transcriptSegments: [
      { startSec: 0, endSec: 5, text: 'Welcome to this cinematic presentation of our project' },
      { startSec: 6, endSec: 15, text: 'Here are the key discoveries we made today' },
    ],
  })
  assert.ok(plan.brollSuggestions.length > 0, 'Must generate B-roll suggestions when requested')
  assert.ok(plan.summary.includes('B-roll cue markers'), 'Plan summary must acknowledge B-roll markers')
  console.log('G5_BROLL_MOTION_PASSED')
}

if (gate === 'G6' || gate === 'all') {
  console.log('--- Testing G6: Cinematic Look Presets ---')
  const { buildEditorialPlan } = await import('../lib/editor/timeline-document.ts')
  const cinematicPlan = buildEditorialPlan('Make it a cinematic documentary style edit', { durationSec: 20 })
  assert.equal(cinematicPlan.lookPreset, 'documentary_35mm_warmth', 'Must assign cinematic look preset')
  assert.equal(cinematicPlan.pacing, 'cinematic', 'Must assign cinematic pacing')
  console.log('G6_CINEMATIC_LOOK_PASSED')
}

if (gate === 'G7' || gate === 'all') {
  console.log('--- Testing G7: Truthful Transcript Status ---')
  const { detectFillerWords } = await import('../lib/voice-companion/filler-words.ts')
  
  // Empty/pending transcript
  const emptyResult = detectFillerWords([])
  assert.ok(emptyResult.summary.includes('generating or empty'), 'Empty transcript must indicate generating or empty state')
  
  // Clean speech transcript
  const cleanResult = detectFillerWords([
    { id: '1', text: 'Good morning everyone.', words: [{ text: 'Good' }, { text: 'morning' }, { text: 'everyone' }] },
  ])
  assert.equal(cleanResult.count, 0, 'Clean speech must have count 0')
  assert.ok(!cleanResult.summary.includes('generating'), 'Clean transcript must not claim generating')
  console.log('G7_TRUTHFUL_TRANSCRIPT_PASSED')
}

if (gate === 'G8' || gate === 'all') {
  console.log('--- Testing G8: Pause & Silence Trimming ---')
  const hookSource = readFileSync('hooks/use-voice-companion.ts', 'utf8')
  assert.match(hookSource, /case 'cut_silence':/, 'cut_silence handler must exist')
  assert.match(hookSource, /minDurationSec/, 'cut_silence must accept minDurationSec')
  console.log('G8_SILENCE_TRIMMING_PASSED')
}

if (gate === 'G9' || gate === 'all') {
  console.log('--- Testing G9: Autonomous Export Trigger ---')
  const hookSource = readFileSync('hooks/use-voice-companion.ts', 'utf8')
  assert.match(hookSource, /case 'export_video':/, 'export_video handler must exist')
  assert.match(hookSource, /renderInitiated:\s*true/, 'start_render must confirm render initiation')
  console.log('G9_EXPORT_TRIGGER_PASSED')
}

console.log('[verify-jarvis-all-fixes] All verified gates passed!')
