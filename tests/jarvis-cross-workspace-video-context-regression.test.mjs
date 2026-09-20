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
assert.match(editorPageSource, /hasVideo:\s*Boolean\(/, 'Editor page must register hasVideo to bridge')
assert.match(editorPageSource, /videoTitle:\s*project\?\.title/, 'Editor page must register videoTitle to bridge')
assert.match(editorPageSource, /videoDurationSec:\s*transportDurationSec/, 'Editor page must register videoDurationSec to bridge')

// 3. Verify useVoiceCompanion maintains frame caching continuity when on tabs without DOM video
const hookSource = readFileSync('hooks/use-voice-companion.ts', 'utf8')
assert.match(hookSource, /lastVideoFrameBase64Ref/, 'useVoiceCompanion must maintain lastVideoFrameBase64Ref')
assert.match(hookSource, /if\s*\(!targetSource\)\s*\{[\s\S]*lastVideoFrameBase64Ref\.current/m, 'useVoiceCompanion must fallback to cached visual frame when DOM video is unmounted')
assert.match(hookSource, /hasVideo:\s*bridge\.hasVideo/, 'get_editor_state must return cross-workspace hasVideo')
assert.match(hookSource, /videoTitle:\s*bridge\.videoTitle/, 'get_editor_state must return videoTitle')

// 4. Verify gemini-live-client instructs Jarvis on cross-workspace video persistence
const liveClientSource = readFileSync('lib/voice-companion/gemini-live-client.ts', 'utf8')
assert.match(liveClientSource, /CROSS-WORKSPACE VIDEO PERSISTENCE & AWARENESS/, 'GeminiLiveClient must instruct Jarvis on cross-workspace video persistence')
assert.match(liveClientSource, /NEVER tell the user "there is no video", "I can't see the video", or "no video is loaded"/, 'GeminiLiveClient must forbid blindness hallucinations when on other tabs')

console.log('jarvis-cross-workspace-video-context-regression: all checks passed')
