import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'

console.log('Running Cinematic Agent Takeover UI test suite...')

// 1. Types validation
assert.ok(existsSync('lib/autonomous-ui/types.ts'), 'types.ts must exist')
const typesSrc = readFileSync('lib/autonomous-ui/types.ts', 'utf8')
assert.match(typesSrc, /export type PillMode = 'action' \| 'waiting' \| 'typing' \| 'idle'/, 'PillMode union defined')
assert.match(typesSrc, /isTakeover: boolean/, 'isTakeover flag in GhostCursorState')
assert.match(typesSrc, /anticipatedTargetRect: DOMRect \| null/, 'anticipatedTargetRect in GhostCursorState')
assert.match(typesSrc, /spotlightRect: DOMRect \| null/, 'spotlightRect in GhostCursorState')

// 2. Coordinator methods
assert.ok(existsSync('lib/autonomous-ui/coordinator.ts'), 'coordinator.ts must exist')
const coordSrc = readFileSync('lib/autonomous-ui/coordinator.ts', 'utf8')
assert.match(coordSrc, /beginTakeover\(/, 'coordinator has beginTakeover method')
assert.match(coordSrc, /endTakeover\(/, 'coordinator has endTakeover method')
assert.match(coordSrc, /anticipateTarget\(/, 'coordinator has anticipateTarget method')
assert.match(coordSrc, /setPillMode\(/, 'coordinator has setPillMode method')

// 3. Agentic Cursor Layer
assert.ok(existsSync('components/editor/autonomous/agentic-cursor-layer.tsx'), 'agentic-cursor-layer.tsx must exist')
const cursorLayerSrc = readFileSync('components/editor/autonomous/agentic-cursor-layer.tsx', 'utf8')
assert.match(cursorLayerSrc, /AgentTakeoverScrim/, 'Orchestrates AgentTakeoverScrim')
assert.match(cursorLayerSrc, /AgentBoundingReticle/, 'Orchestrates AgentBoundingReticle')
assert.match(cursorLayerSrc, /AgentEscapeHatch/, 'Orchestrates AgentEscapeHatch')
assert.match(cursorLayerSrc, /ClickShockwave/, 'Renders click shockwave rings')
assert.match(cursorLayerSrc, /cursorScale = isActuallyClicking \? 0\.97 : 1/, '0.97 micro-compression on click')
assert.match(cursorLayerSrc, /PillIcon/, 'Dynamic action pill with icon morphing')
assert.match(cursorLayerSrc, /role="status"/, 'Accessible status role on pill')
assert.match(cursorLayerSrc, /aria-live="polite"/, 'Accessible aria-live announcements on pill')
assert.match(cursorLayerSrc, /clickCountRef/, 'Monotonic click count reference to avoid key collisions')

// 4. Ambient Scrim & Spotlight Masking
assert.ok(existsSync('components/editor/autonomous/agent-takeover-scrim.tsx'), 'agent-takeover-scrim.tsx must exist')
const scrimSrc = readFileSync('components/editor/autonomous/agent-takeover-scrim.tsx', 'utf8')
assert.match(scrimSrc, /export function AgentTakeoverScrim/, 'Exports AgentTakeoverScrim')
assert.match(scrimSrc, /radial-gradient/, 'Computes spotlight cutout via radial gradient')
assert.match(scrimSrc, /saturate\(0\.55\)/, 'Backdrop saturation pull for contextual focus')
assert.match(scrimSrc, /resize/, 'Listens to viewport resize events for responsive gradient calculation')

// 5. Dynamic Bounding Reticle
assert.ok(existsSync('components/editor/autonomous/agent-bounding-reticle.tsx'), 'agent-bounding-reticle.tsx must exist')
const reticleSrc = readFileSync('components/editor/autonomous/agent-bounding-reticle.tsx', 'utf8')
assert.match(reticleSrc, /export function AgentBoundingReticle/, 'Exports AgentBoundingReticle')
assert.match(reticleSrc, /CornerTicks/, 'Renders precision corner ticks')
assert.match(reticleSrc, /marching-ants/, 'Perimeter marching ants animation')
assert.match(reticleSrc, /isImminent/, 'Pre-intent state morphing to imminent click state')

// 6. Emergency Disconnect Escape Hatch
assert.ok(existsSync('components/editor/autonomous/agent-escape-hatch.tsx'), 'agent-escape-hatch.tsx must exist')
const hatchSrc = readFileSync('components/editor/autonomous/agent-escape-hatch.tsx', 'utf8')
assert.match(hatchSrc, /export function AgentEscapeHatch/, 'Exports AgentEscapeHatch')
assert.match(hatchSrc, /VELOCITY_THRESHOLD_PX_PER_MS/, 'Normalized velocity threshold in px/ms')
assert.match(hatchSrc, /Escape/, 'ESC key abort handler')

// 7. Global keyframes
const cssSrc = readFileSync('app/globals.css', 'utf8')
assert.match(cssSrc, /@keyframes escape-hatch-border/, 'Globals has escape-hatch-border keyframes')
assert.match(cssSrc, /@keyframes marching-ants/, 'Globals has marching-ants keyframes')

// 8. Layout integration
const layoutSrc = readFileSync('app/layout.tsx', 'utf8')
assert.match(layoutSrc, /AgenticCursorLayer/, 'Mounted in app/layout.tsx')

// 9. 3D Claymorphic Rounded Black Cursor
assert.ok(existsSync('components/editor/autonomous/agent-3d-cursor.tsx'), 'agent-3d-cursor.tsx must exist')
const cursor3dSrc = readFileSync('components/editor/autonomous/agent-3d-cursor.tsx', 'utf8')
assert.match(cursor3dSrc, /export function Agent3DCursor/, 'Exports Agent3DCursor')
assert.match(cursor3dSrc, /clay-cursor-body/, 'Defines 3D clay body gradient')
assert.match(cursor3dSrc, /clay-cursor-highlight/, 'Defines specular ridge highlight')
assert.match(cursorLayerSrc, /Agent3DCursor/, 'agentic-cursor-layer mounts Agent3DCursor')

// 10. Viewport Perimeter Moving Border
assert.ok(existsSync('components/editor/autonomous/agent-viewport-moving-border.tsx'), 'agent-viewport-moving-border.tsx must exist')
const movingBorderSrc = readFileSync('components/editor/autonomous/agent-viewport-moving-border.tsx', 'utf8')
assert.match(movingBorderSrc, /export function AgentViewportMovingBorder/, 'Exports AgentViewportMovingBorder')
assert.match(movingBorderSrc, /useAnimationFrame/, 'Uses requestAnimationFrame ticker')
assert.match(movingBorderSrc, /getTotalLength/, 'Tracks SVG path total length for perimeter travel')
assert.match(cursorLayerSrc, /AgentViewportMovingBorder/, 'agentic-cursor-layer mounts AgentViewportMovingBorder')

// 11. Coordinator executeAutonomousTakeover workflow
assert.match(coordSrc, /executeAutonomousTakeover\(/, 'coordinator implements executeAutonomousTakeover')
assert.match(cursorLayerSrc, /prometheus:autonomous-takeover/, 'agentic-cursor-layer handles prometheus:autonomous-takeover event')

// 12. Editor page wiring
const pageSrc = readFileSync('app/editor/[id]/page.tsx', 'utf8')
assert.match(pageSrc, /autonomousCoordinator\.executeAutonomousTakeover/, 'page.tsx wires takeover to executeAutonomousTakeover')
assert.match(pageSrc, /autonomousCoordinator\.executePreviewControl/, 'page.tsx wires preview_control to executePreviewControl')
assert.match(pageSrc, /autonomousCoordinator\.executeExportAction/, 'page.tsx wires start_render to executeExportAction')

// 13. Dedicated target resolvers
const resolverSrc = readFileSync('lib/autonomous-ui/target-resolver.ts', 'utf8')
assert.match(resolverSrc, /export function resolveMuteTarget/, 'target-resolver exports resolveMuteTarget')
assert.match(resolverSrc, /export function resolvePlaybackTarget/, 'target-resolver exports resolvePlaybackTarget')
assert.match(resolverSrc, /export function resolveExportTarget/, 'target-resolver exports resolveExportTarget')
assert.match(resolverSrc, /export function resolveScrubberTarget/, 'target-resolver exports resolveScrubberTarget')
assert.match(resolverSrc, /export function resolveThumbnailStudioTarget/, 'target-resolver exports resolveThumbnailStudioTarget')
assert.match(resolverSrc, /export function resolveMasterReviewTarget/, 'target-resolver exports resolveMasterReviewTarget')

// 14. Dedicated coordinator expressivity workflows
assert.match(coordSrc, /executePreviewControl\(/, 'coordinator implements executePreviewControl')
assert.match(coordSrc, /executeExportAction\(/, 'coordinator implements executeExportAction')
assert.match(coordSrc, /executeThumbnailStudio\(/, 'coordinator implements executeThumbnailStudio')
assert.match(coordSrc, /executeMasterReview\(/, 'coordinator implements executeMasterReview')

// 15. DOM targets have explicit targeting attributes
const timelineSrc = readFileSync('components/editor/TimelinePanel.tsx', 'utf8')
assert.match(timelineSrc, /data-action="toggle-mute"/, 'TimelinePanel mute button has data-action')
assert.match(timelineSrc, /data-autonomous-target="mute"/, 'TimelinePanel mute button has data-autonomous-target')
assert.match(timelineSrc, /data-action="toggle-playback"/, 'TimelinePanel play button has data-action')
assert.match(timelineSrc, /data-autonomous-target="playback"/, 'TimelinePanel play button has data-autonomous-target')

const exportClusterSrc = readFileSync('components/editor/cinematic-export-cluster.tsx', 'utf8')
assert.match(exportClusterSrc, /data-action="export"/, 'CinematicExportCluster has data-action="export"')

console.log('Cinematic Agent Takeover UI test suite: ALL 15 VERIFICATION GATES PASSED!')
