import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildMotionSnapPoints,
  buildMotionTimelineItems,
  moveMotionTimelineItem,
  splitMotionTimelineItem,
  trimMotionTimelineItem,
  type MotionTimelineItem,
} from '../lib/timeline/motion-timeline'

const item: MotionTimelineItem = {
  id: 'caption-1',
  track: 'captions',
  kind: 'caption',
  label: 'Hello world',
  text: 'Hello world',
  start: 2,
  end: 5,
  region: 'bottom',
  color: 'white',
  animation: 'fade',
}

test('builds independent source, caption, and text timeline items', () => {
  const items = buildMotionTimelineItems({
    duration: 12,
    sourceLabel: 'Interview.mp4',
    transcriptSegments: [{ id: 'seg-1', start: 1, end: 3, text: 'A line' }],
    textPlacements: [{ id: 'text-1', start: 4, end: 7, text: 'Title', region: 'top' }],
  })

  assert.deepEqual(items.map(({ id, track }) => [id, track]), [
    ['video-source', 'video'],
    ['audio-source', 'audio'],
    ['caption-seg-1', 'captions'],
    ['text-text-1', 'text'],
  ])
  assert.equal(items[2].text, 'A line')
  assert.equal(items[3].region, 'top')
})

test('moves an item and snaps its leading edge to the playhead', () => {
  const snaps = buildMotionSnapPoints([item], 8, 20, 'caption-1')
  const moved = moveMotionTimelineItem(item, 5.8, { duration: 20, snapPoints: snaps, zoomScale: 1 })

  assert.equal(moved.start, 8)
  assert.equal(moved.end, 11)
})

test('trims edges while enforcing duration bounds and minimum duration', () => {
  const startTrimmed = trimMotionTimelineItem(item, 'start', -4, { duration: 6 })
  assert.equal(startTrimmed.start, 0)
  assert.equal(startTrimmed.end, 5)

  const endTrimmed = trimMotionTimelineItem(item, 'end', 20, { duration: 6 })
  assert.equal(endTrimmed.end, 6)

  const collapsed = trimMotionTimelineItem(item, 'end', -20, { duration: 20 })
  assert.ok(Math.abs(collapsed.end - collapsed.start - 0.1) < 0.0001)
})

test('splits an item at the playhead into two independently editable blocks', () => {
  const [first, second] = splitMotionTimelineItem(item, 3.5)

  assert.equal(first.id, 'caption-1')
  assert.equal(second.id, 'caption-1-split')
  assert.deepEqual([first.start, first.end], [2, 3.5])
  assert.deepEqual([second.start, second.end], [3.5, 5])
  assert.equal(second.text, item.text)
  assert.notEqual(first, second)
})
