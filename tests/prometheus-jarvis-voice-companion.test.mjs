import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'

console.log('Running Prometheus Jarvis Voice Companion regression test...')

// 1. Verify files exist
assert.ok(existsSync('app/api/voice-companion/session/route.ts'), 'session route must exist')
assert.ok(existsSync('lib/voice-companion/audio-streamer.ts'), 'audio streamer must exist')
assert.ok(existsSync('lib/voice-companion/gemini-live-client.ts'), 'gemini live client must exist')
assert.ok(existsSync('hooks/use-voice-companion.ts'), 'voice companion hook must exist')
assert.ok(existsSync('components/editor/voice-companion-hud.tsx'), 'voice companion hud must exist')

// 2. Check PrometheusChat composer cleanliness
const chatSource = readFileSync('components/editor/PrometheusChat.tsx', 'utf8')
assert.ok(!chatSource.includes('data-jarvis-companion-toggle'), 'PrometheusChat composer must not have redundant companion toggle icon')
assert.ok(!chatSource.includes('VoiceCompanionHud'), 'PrometheusChat must not render redundant VoiceCompanionHud')

// 3. Check AudioStreamer instant barge-in flush capability
const audioSource = readFileSync('lib/voice-companion/audio-streamer.ts', 'utf8')
assert.match(audioSource, /flush\(\)/, 'AudioPlayer must provide flush() for instant barge-in')
assert.match(audioSource, /downsampleBuffer/, 'AudioRecorder must downsample to 16kHz PCM')

// 4. Check GeminiLiveClient setup and tool handling
const sessionSource = readFileSync('app/api/voice-companion/session/route.ts', 'utf8')
assert.match(sessionSource, /BidiGenerateContent/, 'Must use BidiGenerateContent endpoint')

const clientSource = readFileSync('lib/voice-companion/gemini-live-client.ts', 'utf8')
assert.match(clientSource, /models\/gemini-2.0-flash-exp/, 'Must configure Gemini 2.0 Flash model')
assert.match(clientSource, /seek_timeline/, 'Must declare seek_timeline tool')
assert.match(clientSource, /preview_control/, 'Must declare preview_control tool')
assert.match(clientSource, /interrupted/, 'Must handle interrupted barge-in event')

// 5. Check HUD visualizer and controls
const hudSource = readFileSync('components/editor/voice-companion-hud.tsx', 'utf8')
assert.match(hudSource, /Jarvis Companion/, 'HUD must identify as Jarvis Companion')
assert.match(hudSource, /assistantVolume/, 'HUD must bind to assistant volume')
assert.match(hudSource, /userVolume/, 'HUD must bind to user volume')
assert.match(hudSource, /isVisionActive/, 'HUD must provide vision synchrony indicator')

// 6. Check Top Nav Kinetic Filament & Global App Mounting
const layoutSource = readFileSync('app/layout.tsx', 'utf8')
assert.match(layoutSource, /JarvisTopNavFilament/, 'app/layout.tsx must mount JarvisTopNavFilament')

const filamentSource = readFileSync('components/navigation/jarvis-top-nav-filament.tsx', 'utf8')
assert.match(filamentSource, /jarvisLineGrad/, 'Filament must have cyan/blue gradient definition')
assert.match(filamentSource, /jarvisNeonGlow/, 'Filament must have neon glow filter')
assert.match(filamentSource, /Math\.sin\(\(Math\.PI \* i\) \/ numPoints\)/, 'Filament must use sine envelope for pinned endpoints')
assert.match(filamentSource, /phaseRef\.current/, 'Filament must compute animated phase motion')

console.log('prometheus-jarvis-voice-companion: all checks passed successfully!')
