import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'

console.log('Running Jarvis Timeline JSON & Editorial Plan Regression Test...')

// 1. Timeline document module must exist
assert.ok(existsSync('lib/editor/timeline-document.ts'), 'lib/editor/timeline-document.ts must exist')

// 2. Import timeline document methods
const {
  createDefaultTimelineDocument,
  buildEditorialPlan,
  applyEditorialPlanToTimeline,
} = await import('../lib/editor/timeline-document.ts')

// 3. Test creating and updating timeline document
const initialDoc = createDefaultTimelineDocument({
  durationSec: 45,
  sourceAssetId: 'test-source',
})
assert.ok(initialDoc.tracks, 'Timeline document must have tracks')
assert.ok(initialDoc.tracks.video, 'Must have video track')
assert.ok(initialDoc.tracks.music, 'Must have music track')
assert.ok(initialDoc.tracks.captions, 'Must have captions track')
assert.ok(Array.isArray(initialDoc.tracks.zooms), 'Must have zooms track')

// 4. Test plan generation from generic cinematic prompt
const plan = buildEditorialPlan('Make this video look cinematic and high-tier documentary style', {
  durationSec: 45,
  transcriptText: 'We started in a garage and built a revolutionary product.',
})
assert.ok(plan.captionStyle, 'Plan must recommend a caption stylization')
assert.ok(plan.lookPreset || plan.lightingAdjustment, 'Plan must specify color look / lighting')
assert.ok(plan.musicDirection, 'Plan must specify music direction')
assert.ok(Array.isArray(plan.zooms) && plan.zooms.length > 0, 'Plan must generate dynamic zooms')
assert.ok(Array.isArray(plan.brollSuggestions), 'Plan must suggest B-rolls')

// 5. Apply plan to document
const updatedDoc = applyEditorialPlanToTimeline(initialDoc, plan)
assert.equal(updatedDoc.tracks.captions.style, plan.captionStyle)
assert.ok(updatedDoc.tracks.zooms.length > 0, 'Zooms must be populated in timeline document')

// 6. Check tool definition in gemini-live-client.ts
const clientSource = readFileSync('lib/voice-companion/gemini-live-client.ts', 'utf8')
assert.match(clientSource, /apply_editorial_plan|execute_timeline_plan/, 'gemini-live-client must declare apply_editorial_plan tool')

// 7. Check useVoiceCompanion handles editorial plan execution with timeline movement
const hookSource = readFileSync('hooks/use-voice-companion.ts', 'utf8')
assert.match(hookSource, /case 'apply_editorial_plan':|case 'execute_timeline_plan':/, 'useVoiceCompanion must implement editorial plan execution')

console.log('jarvis-timeline-json-editorial-plan: all checks passed')
