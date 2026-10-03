import assert from 'node:assert/strict'
import test from 'node:test'
import { applyThumbnailCreativeDirection } from '../lib/thumbnails/creative-direction'
import { motionCropTransform } from '../lib/editor/motion-framing'
import { sourceClips, splitSource } from '../lib/editor/timeline-tools'

test('explicit thumbnail direction wins over the default reference and planned concept', () => {
  const preset = 'Use a quiet clean studio portrait. RETENTION CONCEPT: soft pastel light.'
  const prompt = applyThumbnailCreativeDirection(preset, '  I need an aggressive-looking thumbnail  ')
  assert.ok(prompt.startsWith(preset))
  assert.ok(prompt.endsWith('Do not render the brief itself as text in the image.'))
  assert.ok(prompt.includes('"I need an aggressive-looking thumbnail"'))
  assert.ok(prompt.includes('FINAL CREATOR BRIEF (highest priority)'))
  assert.ok(prompt.includes('take priority over conflicting presets, references, channel DNA, or planned concepts'))
  assert.ok(prompt.includes('follow each explicit request in the order written'))
  assert.ok(prompt.includes('do not drop later details'))
  assert.ok(prompt.includes('exact supplied headline'))
  assert.equal(applyThumbnailCreativeDirection(preset, '   '), preset)
})

test('crop handles scale and center media while the full frame is unchanged', () => {
  assert.equal(motionCropTransform({ left: 0, top: 0, width: 100, height: 100 }), 'translate(0%, 0%) scale(1)')
  assert.equal(motionCropTransform({ left: 25, top: 25, width: 50, height: 50 }), 'translate(0%, 0%) scale(2)')
  assert.equal(motionCropTransform({ left: 0, top: 0, width: 50, height: 50 }), 'translate(50%, 50%) scale(2)')
  assert.equal(motionCropTransform({ left: 25, top: 0, width: 50, height: 100 }), 'translate(0%, 0%) scale(2)')
})

test('split divides footage at the playhead without removing time', () => {
  const original = sourceClips(12, 'My source', [], [])
  const splits = splitSource([], original, 4)
  const clips = sourceClips(12, 'My source', splits, [])
  assert.deepEqual(clips.map(({ start, end }) => ({ start, end })), [{ start: 0, end: 4 }, { start: 4, end: 12 }])
  assert.equal(clips.reduce((length, clip) => length + clip.end - clip.start, 0), 12)
  assert.equal(splitSource(splits, clips, 4), splits)
  assert.equal(splitSource(splits, clips, 0), splits)
  assert.equal(splitSource(splits, clips, 12), splits)
})

test('deleting a source division preserves all other footage and cut ranges', () => {
  const cuts = [{ start: 4, end: 8 }]
  assert.deepEqual(sourceClips(12, 'Source', [4, 8], cuts).map(({ start, end }) => ({ start, end })), [{ start: 0, end: 4 }, { start: 8, end: 12 }])
  assert.equal(sourceClips(12, 'Source', [], [{ start: 0, end: 12 }]).length, 0)
  assert.equal(splitSource([], sourceClips(12, 'Source', [], cuts), 6).length, 0)
})
