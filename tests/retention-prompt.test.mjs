import assert from 'node:assert/strict'
import test from 'node:test'
import { buildThumbnailPromptPlannerText, extractPlannedArtDirection, THUMBNAIL_PROMPT_PLANNER_INSTRUCTIONS } from '../lib/thumbnails/retention-prompt.ts'

test('prompt planner carries the brief, exact headline, source context, and selected reference', () => {
  const prompt = buildThumbnailPromptPlannerText({
    projectTitle: 'Founder story',
    transcriptSnippet: 'I nearly lost the company in the first year.',
    headline: 'One Bad Decision',
    creativeDirection: 'Show the founder under pressure, but keep it truthful.',
    aspectRatio: '16:9',
    referenceCue: 'Dark cinematic close-up with a clean red directional accent.',
  })

  assert.match(THUMBNAIL_PROMPT_PLANNER_INSTRUCTIONS, /truthful viewer retention/i)
  assert.match(THUMBNAIL_PROMPT_PLANNER_INSTRUCTIONS, /identity must remain recognizable/i)
  assert.match(prompt, /One Bad Decision/)
  assert.match(prompt, /nearly lost the company/)
  assert.match(prompt, /red directional accent/)
  assert.match(prompt, /16:9/)
})

test('planner response parser accepts bounded JSON art direction and rejects malformed output', () => {
  assert.equal(extractPlannedArtDirection('{"artDirection":"Close portrait, warm rim light, one truthful proof prop."}'), 'Close portrait, warm rim light, one truthful proof prop.')
  assert.equal(extractPlannedArtDirection('{"artDirection":4}'), null)
  assert.equal(extractPlannedArtDirection('not json'), null)
})
