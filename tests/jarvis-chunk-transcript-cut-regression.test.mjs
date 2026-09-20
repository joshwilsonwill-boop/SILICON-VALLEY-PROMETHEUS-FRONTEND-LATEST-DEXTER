import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

console.log('Running Jarvis Chunk Transcript Cut Regression Test...')

// 1. Verify target-resolver exports resolveTranscriptChunkCutTarget
const { resolveTranscriptChunkCutTarget } = await import('../lib/autonomous-ui/target-resolver.ts')
assert.equal(typeof resolveTranscriptChunkCutTarget, 'function', 'Must export resolveTranscriptChunkCutTarget')

// 2. Check motion-edit-workspace renders autonomous segment cut target
const motionWorkspaceSource = readFileSync('components/editor/motion-edit-workspace.tsx', 'utf8')
assert.match(motionWorkspaceSource, /data-action="cut-segment"/, 'Motion edit workspace must render cut-segment action')
assert.match(motionWorkspaceSource, /data-autonomous-target="transcript-segment-cut"/, 'Motion edit workspace must expose segment cut target')

// 3. Check coordinator.executeTranscriptCut wires chunk-level and inverse cuts
const coordinatorSource = readFileSync('lib/autonomous-ui/coordinator.ts', 'utf8')
assert.match(coordinatorSource, /resolveTranscriptChunkCutTarget/, 'Coordinator must evaluate chunk cut target')
assert.match(coordinatorSource, /chunkRes\.strategy === 'segment_cut'/, 'Coordinator must support direct chunk-level cut')
assert.match(coordinatorSource, /chunkRes\.strategy === 'inverse_restore'/, 'Coordinator must support inverse restore optimization')
assert.match(coordinatorSource, /onToggleCutSegment\??:/, 'Coordinator must support onToggleCutSegment option')

// 4. Check hook use-voice-companion wires onToggleCutSegment from bridge
const hookSource = readFileSync('hooks/use-voice-companion.ts', 'utf8')
assert.match(hookSource, /onToggleCutSegment:\s*handlersRef\.current\.onToggleCutSegment/, 'useVoiceCompanion must pass onToggleCutSegment to autonomous coordinator')

console.log('jarvis-chunk-transcript-cut-regression: all checks passed')
