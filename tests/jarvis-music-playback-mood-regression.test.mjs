import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

console.log('Running Jarvis Music Playback & Mood Regression Test...')

// 1. Verify song-intelligence scoring with video mood & pace
const { scoreSongCandidates, getBestMatchingTrack } = await import('../lib/autonomous-ui/song-intelligence.ts')

const scoredWithMood = scoreSongCandidates('trailer', {
  mood: 'intense dramatic',
  pace: 'fast',
})
assert.ok(scoredWithMood.length > 0, 'Must return scored candidates')
assert.equal(scoredWithMood[0].track.id, 'music-preview-cinematic-trailer-epic-intense-trailer', 'Must rank intense trailer highest for fast intense trailer context')
assert.ok(scoredWithMood[0].matchReasons.some((r) => r.includes('mood')), 'Must include video mood match reason')

// 2. Verify MusicTabPanel search filter handles tags, genres, and categories
const musicPanelSource = readFileSync('components/editor/music-tab-panel.tsx', 'utf8')
assert.match(musicPanelSource, /genre\.includes\(normalizedQuery\)/, 'MusicTabPanel filter must match genre')
assert.match(musicPanelSource, /tags\.some\(/, 'MusicTabPanel filter must match moodTags and vibeTags')
assert.match(musicPanelSource, /queryTokens\.some\(/, 'MusicTabPanel filter must support tokenized multi-word search')

// 3. Verify bridge defines direct music track selection & preview handlers
const bridgeSource = readFileSync('lib/voice-companion/bridge.ts', 'utf8')
assert.match(bridgeSource, /onSelectMusicTrack\??:/, 'Bridge must define onSelectMusicTrack')
assert.match(bridgeSource, /onPlayMusicPreview\??:/, 'Bridge must define onPlayMusicPreview')
assert.match(bridgeSource, /videoMusicContext\??:/, 'Bridge must define videoMusicContext')

// 4. Verify editor page registers onSelectMusicTrack and videoMusicContext
const editorPageSource = readFileSync('app/editor/[id]/page.tsx', 'utf8')
assert.match(editorPageSource, /onSelectMusicTrack:\s*\(trackId:\s*string\)/, 'Editor page must register onSelectMusicTrack')
assert.match(editorPageSource, /videoMusicContext:\s*videoContext/, 'Editor page must register videoMusicContext')

// 5. Verify coordinator handles clean search query and preview-only auditioning
const coordinatorSource = readFileSync('lib/autonomous-ui/coordinator.ts', 'utf8')
assert.match(coordinatorSource, /searchPhrase/, 'Coordinator must extract clean keyword search phrase')
assert.match(coordinatorSource, /onPlayPreview/, 'Coordinator must support onPlayPreview')
assert.match(coordinatorSource, /isPreviewOnly/, 'Coordinator must differentiate preview from immediate staging')

// 6. Verify Gemini Live client instructs Jarvis on truthful previewing
const liveClientSource = readFileSync('lib/voice-companion/gemini-live-client.ts', 'utf8')
assert.match(liveClientSource, /MUSIC AUDITIONING & PLAYBACK TRUTHFULNESS/, 'GeminiLiveClient must instruct Jarvis on truthful previewing')
assert.match(liveClientSource, /NEVER falsely claim that a song is already playing on the video timeline/, 'GeminiLiveClient must forbid false timeline playback assertions')

console.log('jarvis-music-playback-mood-regression: all checks passed')
