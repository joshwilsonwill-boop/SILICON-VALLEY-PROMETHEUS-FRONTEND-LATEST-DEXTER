import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'

console.log('Running Prometheus Autonomous UI Coordinator regression test...')

// 1. Verify Core Autonomous UI files exist
assert.ok(existsSync('lib/autonomous-ui/types.ts'), 'lib/autonomous-ui/types.ts must exist')
assert.ok(existsSync('lib/autonomous-ui/target-resolver.ts'), 'lib/autonomous-ui/target-resolver.ts must exist')
assert.ok(existsSync('lib/autonomous-ui/motion-driver.ts'), 'lib/autonomous-ui/motion-driver.ts must exist')
assert.ok(existsSync('lib/autonomous-ui/coordinator.ts'), 'lib/autonomous-ui/coordinator.ts must exist')
assert.ok(existsSync('components/editor/autonomous/agentic-cursor-layer.tsx'), 'agentic-cursor-layer.tsx must exist')

// 2. Check EditorRouteShell mounting
const shellSource = readFileSync('components/editor/EditorRouteShell.tsx', 'utf8')
assert.match(shellSource, /AgenticCursorLayer/, 'EditorRouteShell must import and mount AgenticCursorLayer')

// 3. Check MotionEditWorkspace DOM data attributes for target resolver
const workspaceSource = readFileSync('components/editor/motion-edit-workspace.tsx', 'utf8')
assert.match(workspaceSource, /data-word-index=\{index\}/, 'motion-edit-workspace must render data-word-index on word spans')
assert.match(workspaceSource, /data-transcript-segment-id=\{segment\.id\}/, 'motion-edit-workspace must render data-transcript-segment-id')

// 4. Check GeminiLiveClient autonomous tool declarations
const clientSource = readFileSync('lib/voice-companion/gemini-live-client.ts', 'utf8')
assert.match(clientSource, /autonomous_transcript_cut/, 'gemini-live-client must declare autonomous_transcript_cut tool')
assert.match(clientSource, /autonomous_music_action/, 'gemini-live-client must declare autonomous_music_action tool')

// 5. Check useVoiceCompanion autonomous dispatch wiring
const hookSource = readFileSync('hooks/use-voice-companion.ts', 'utf8')
assert.match(hookSource, /autonomousCoordinator\.executeTranscriptCut/, 'useVoiceCompanion must dispatch executeTranscriptCut')
assert.match(hookSource, /autonomousCoordinator\.executeMusicSelection/, 'useVoiceCompanion must dispatch executeMusicSelection')

// 6. Check Motion Driver easing mathematics & trajectory arc
const motionSource = readFileSync('lib/autonomous-ui/motion-driver.ts', 'utf8')
assert.match(motionSource, /cubicEaseInOut/, 'motion-driver must define cubicEaseInOut')
assert.match(motionSource, /computeTrajectoryPoint/, 'motion-driver must define computeTrajectoryPoint')

console.log('autonomous-ui-coordinator: all verification checks passed successfully!')
