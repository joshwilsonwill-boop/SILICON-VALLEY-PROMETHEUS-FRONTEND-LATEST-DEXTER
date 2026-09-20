import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'

console.log('Running Jarvis Filler-Word & Silence Regression Test...')

// 1. Module must exist
assert.ok(existsSync('lib/voice-companion/filler-words.ts'), 'lib/voice-companion/filler-words.ts must exist')

// 2. Import detection logic
const { detectFillerWords, COMMON_FILLER_PATTERNS } = await import('../lib/voice-companion/filler-words.ts')
assert.ok(Array.isArray(COMMON_FILLER_PATTERNS), 'COMMON_FILLER_PATTERNS must be an array')
assert.ok(COMMON_FILLER_PATTERNS.includes('um') && COMMON_FILLER_PATTERNS.includes('uh'), 'Must include um and uh')

// 3. Test detection on clean video (0 ums)
const cleanSegments = [
  {
    id: 'seg-1',
    start: 0,
    end: 3.5,
    text: 'Welcome back to our channel today we talk about video production.',
    words: [
      { text: 'Welcome', start: 0, end: 0.5 },
      { text: 'back', start: 0.5, end: 0.8 },
      { text: 'to', start: 0.8, end: 1.0 },
      { text: 'our', start: 1.0, end: 1.3 },
      { text: 'channel', start: 1.3, end: 1.9 },
    ],
  },
]
const cleanResult = detectFillerWords(cleanSegments)
assert.equal(cleanResult.count, 0, 'Clean video must detect exactly 0 filler words')
assert.equal(cleanResult.items.length, 0)
assert.match(cleanResult.summary, /0 filler words|clean/i, 'Summary must truthfully state 0 filler words')

// 4. Test detection on video with ums
const messySegments = [
  {
    id: 'seg-2',
    start: 0,
    end: 4.0,
    text: 'Um so like we basically ah started the company.',
    words: [
      { text: 'Um', start: 0, end: 0.4 },
      { text: 'so', start: 0.4, end: 0.8 },
      { text: 'like', start: 0.8, end: 1.2 },
      { text: 'we', start: 1.2, end: 1.5 },
      { text: 'basically', start: 1.5, end: 2.1 },
      { text: 'ah', start: 2.1, end: 2.5 },
      { text: 'started', start: 2.5, end: 3.0 },
    ],
  },
]
const messyResult = detectFillerWords(messySegments)
assert.ok(messyResult.count >= 2, 'Must detect Um and ah')
assert.equal(messyResult.items[0].word.toLowerCase(), 'um')

// 5. Check live client tools include detect_filler_words and cut_silence
const liveClientSource = readFileSync('lib/voice-companion/gemini-live-client.ts', 'utf8')
assert.match(liveClientSource, /detect_filler_words/, 'gemini-live-client must declare detect_filler_words tool')
assert.match(liveClientSource, /remove_silence|cut_silence/, 'gemini-live-client must declare remove_silence or cut_silence tool')

// 6. Check useVoiceCompanion handles detect_filler_words honestly without pretending
const hookSource = readFileSync('hooks/use-voice-companion.ts', 'utf8')
assert.match(hookSource, /case 'detect_filler_words':/, 'useVoiceCompanion must implement detect_filler_words')
assert.match(hookSource, /case 'cut_silence':|case 'remove_silence':/, 'useVoiceCompanion must implement cut_silence/remove_silence')

console.log('jarvis-filler-word-silence-regression: all checks passed')
