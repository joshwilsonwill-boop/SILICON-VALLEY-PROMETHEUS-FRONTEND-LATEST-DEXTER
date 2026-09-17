import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'

console.log('Running Prometheus Autonomous UI Coordinator regression test...')

// 1. Verify Core Autonomous UI files exist
assert.ok(existsSync('lib/autonomous-ui/types.ts'), 'lib/autonomous-ui/types.ts must exist')
assert.ok(existsSync('lib/autonomous-ui/target-resolver.ts'), 'lib/autonomous-ui/target-resolver.ts must exist')
assert.ok(existsSync('lib/autonomous-ui/motion-driver.ts'), 'lib/autonomous-ui/motion-driver.ts must exist')
assert.ok(existsSync('lib/autonomous-ui/coordinator.ts'), 'lib/autonomous-ui/coordinator.ts must exist')
assert.ok(existsSync('components/editor/autonomous/agentic-cursor-layer.tsx'), 'agentic-cursor-layer.tsx must exist')

// 2. Check Layout & EditorRouteShell mounting
const layoutSource = readFileSync('app/layout.tsx', 'utf8')
assert.match(layoutSource, /AgenticCursorLayer/, 'app/layout.tsx must import and mount AgenticCursorLayer')
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

// 7. Check Coordinator live thought streaming and continuous operator workflows
const coordinatorSource = readFileSync('lib/autonomous-ui/coordinator.ts', 'utf8')
assert.match(coordinatorSource, /public streamThought\(/, 'coordinator must define streamThought for real-time thought projection')
assert.match(coordinatorSource, /public streamTool\(/, 'coordinator must define streamTool')
assert.match(coordinatorSource, /public streamStatus\(/, 'coordinator must define streamStatus')
assert.match(coordinatorSource, /public async executeAutonomousEditingWorkflow\(/, 'coordinator must define executeAutonomousEditingWorkflow')
assert.match(coordinatorSource, /resolveMusicSearchTarget/, 'coordinator must import and use resolveMusicSearchTarget')
assert.match(coordinatorSource, /resolveMusicPlayTarget/, 'coordinator must import and use resolveMusicPlayTarget')
assert.match(coordinatorSource, /resolveMusicSelectTarget/, 'coordinator must import and use resolveMusicSelectTarget')
assert.match(coordinatorSource, /resolveSplitTarget/, 'coordinator must import and use resolveSplitTarget')

// 8. Check Target Resolver extensions
const resolverSource = readFileSync('lib/autonomous-ui/target-resolver.ts', 'utf8')
assert.match(resolverSource, /export function resolveMusicSearchTarget\(/, 'target-resolver must export resolveMusicSearchTarget')
assert.match(resolverSource, /export function resolveMusicPlayTarget\(/, 'target-resolver must export resolveMusicPlayTarget')
assert.match(resolverSource, /export function resolveMusicSelectTarget\(/, 'target-resolver must export resolveMusicSelectTarget')
assert.match(resolverSource, /export function resolveSplitTarget\(/, 'target-resolver must export resolveSplitTarget')
assert.match(resolverSource, /export function resolveStylingTarget\(/, 'target-resolver must export resolveStylingTarget')

// 9. Check useAIChat thoughts stream to autonomous coordinator
const chatHookSource = readFileSync('hooks/use-ai-chat.ts', 'utf8')
assert.match(chatHookSource, /autonomousCoordinator\.streamThought\(/, 'use-ai-chat must stream thoughts to autonomousCoordinator')
assert.match(chatHookSource, /autonomousCoordinator\.streamStatus\(/, 'use-ai-chat must stream status to autonomousCoordinator')

// 10. Check editor page handleApplyChatActions continuous operator routing
const editorPageSource = readFileSync('app/editor/[id]/page.tsx', 'utf8')
assert.match(editorPageSource, /executeAutonomousEditingWorkflow/, 'editor page must route split/caption actions to executeAutonomousEditingWorkflow')
assert.match(editorPageSource, /isContinuous/, 'editor page handleApplyChatActions must support isContinuous operator chaining')

// 11. Check Silence Ripple-Cut Workflow and targets
assert.match(coordinatorSource, /public async executeSilenceCutWorkflow\(/, 'coordinator must define executeSilenceCutWorkflow')
assert.match(resolverSource, /export function resolveSilenceCutTarget\(/, 'target-resolver must export resolveSilenceCutTarget')
const editorActionsSource = readFileSync('lib/editor-actions.ts', 'utf8')
assert.match(editorActionsSource, /'cut_silence'/, 'editor-actions must support cut_silence action')
assert.match(editorPageSource, /executeSilenceCutWorkflow/, 'editor page must route cut_silence action to executeSilenceCutWorkflow')

// 12. Check Flagship Model Default (Gemini 2.5 Pro)
const streamRouteSource = readFileSync('app/api/prometheus-chat/stream/route.ts', 'utf8')
assert.match(streamRouteSource, /gemini-2\.5-pro/, 'stream route fallback must default to gemini-2.5-pro')
const geminiStreamSource = readFileSync('lib/prometheus-assistant/gemini-stream.ts', 'utf8')
assert.match(geminiStreamSource, /'gemini-2\.5-pro'/, 'gemini-stream preferred models must prioritize gemini-2.5-pro')

console.log('autonomous-ui-coordinator: all verification checks passed successfully!')
