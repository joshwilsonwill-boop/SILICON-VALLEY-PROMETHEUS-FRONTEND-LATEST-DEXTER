import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

console.log('Running Jarvis Cross-Workspace Video Context Regression Test...')

// 1. Verify bridge defines cross-workspace video persistence fields
const bridgeSource = readFileSync('lib/voice-companion/bridge.ts', 'utf8')
assert.match(bridgeSource, /hasVideo\??:\s*boolean/, 'Bridge must define hasVideo')
assert.match(bridgeSource, /videoTitle\??:\s*string/, 'Bridge must define videoTitle')
assert.match(bridgeSource, /videoDurationSec\??:\s*number/, 'Bridge must define videoDurationSec')

// 2. Verify editor page supplies hasVideo and videoTitle to bridge
const editorPageSource = readFileSync('app/editor/[id]/page.tsx', 'utf8')
assert.match(editorPageSource, /hasVideo:\s*hasPlayableVideo/, 'Editor page must register only playable source video as hasVideo')
assert.match(editorPageSource, /videoTitle:\s*project\?\.title/, 'Editor page must register videoTitle to bridge')
assert.match(editorPageSource, /videoDurationSec:\s*hasPlayableVideo\s*\?/, 'Editor page must report source duration only when video is playable')
assert.match(editorPageSource, /timelineDurationSec:\s*transportDurationSec/, 'Editor page must report timeline duration separately from source duration')
assert.match(editorPageSource, /return scenes\.length > 0 \? scenes\[scenes\.length - 1\]!\.endMs : 0/, 'An empty scene list must not invent a 48-second timeline')

// 3. Verify useVoiceCompanion uses the editor bridge rather than claiming unseen visual frames
const hookSource = readFileSync('hooks/use-voice-companion.ts', 'utf8')
assert.match(hookSource, /Visual-frame controls were removed; editor context still arrives through the bridge/, 'useVoiceCompanion must not retain the obsolete frame cache')
assert.doesNotMatch(hookSource, /lastVideoFrameBase64Ref/, 'useVoiceCompanion must not cache stale video frames')
assert.match(hookSource, /const hasVideo = bridge\.hasVideo \?\? false/, 'get_editor_state must read cross-workspace source-media state')
assert.match(hookSource, /sourceMediaState:\s*bridge\.sourceMediaState/, 'get_editor_state must report the explicit source-media state')
assert.match(hookSource, /videoTitle:\s*hasVideo \? \(bridge\.videoTitle/, 'get_editor_state must hide source metadata when video is unavailable')

// 4. Verify gemini-live-client gives Jarvis truthful cross-workspace media state
const liveClientSource = readFileSync('lib/voice-companion/gemini-live-client.ts', 'utf8')
assert.match(liveClientSource, /Treat hasVideo and sourceMediaState as the authority/, 'GeminiLiveClient must ground video availability in live editor state')
assert.match(liveClientSource, /A nonzero timelineDurationSec, transcript, project title, or remembered context does not prove a source video is loaded/, 'GeminiLiveClient must distinguish timeline length from attached video')
assert.match(liveClientSource, /If no frames were provided, be clear that you cannot see the footage/, 'GeminiLiveClient must not claim visual access without frames')
assert.doesNotMatch(liveClientSource, /project video is ALWAYS loaded|NEVER tell the user "there is no video"/, 'GeminiLiveClient must not force video-presence claims')

console.log('jarvis-cross-workspace-video-context-regression: all checks passed')
