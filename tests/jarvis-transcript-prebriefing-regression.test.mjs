import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

console.log('Running Jarvis Transcript Pre-Briefing Regression Test...')

// 1. Check Voice Companion Bridge contains transcript and brand fields
const bridgeSource = readFileSync('lib/voice-companion/bridge.ts', 'utf8')
assert.match(bridgeSource, /transcriptText\??:\s*string|getTranscriptText/, 'bridge must define transcriptText or getTranscriptText')
assert.match(bridgeSource, /transcriptSegments\??:\s*unknown|getTranscriptSegments/, 'bridge must define transcriptSegments')
assert.match(bridgeSource, /brandProfile\??:/, 'bridge must define brandProfile')

// 2. Check editor page registers transcript and brand to the bridge
const editorPageSource = readFileSync('app/editor/[id]/page.tsx', 'utf8')
assert.match(editorPageSource, /registerVoiceCompanionBridge\(\{[\s\S]*transcript/m, 'editor page must register transcript to voice companion bridge')
assert.match(editorPageSource, /registerVoiceCompanionBridge\(\{[\s\S]*brandProfile/m, 'editor page must register brandProfile to voice companion bridge')

// 3. Check useVoiceCompanion connects with video context pre-briefing
const hookSource = readFileSync('hooks/use-voice-companion.ts', 'utf8')
assert.match(hookSource, /transcriptText|transcriptSummary|getTranscriptText/, 'useVoiceCompanion must read transcript from bridge')
assert.match(hookSource, /clientRef\.current\?\.sendContextText|preBriefingContext|sendSetupMessage/i, 'useVoiceCompanion must pre-brief Jarvis with transcript context')

// 4. Check gemini-live-client handles video transcript context injection
const liveClientSource = readFileSync('lib/voice-companion/gemini-live-client.ts', 'utf8')
assert.match(liveClientSource, /videoTranscript|transcriptContext|sendContextText/i, 'gemini-live-client must support video transcript injection')

console.log('jarvis-transcript-prebriefing-regression: all checks passed')
