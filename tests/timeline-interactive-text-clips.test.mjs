import assert from 'node:assert/strict'
import {
  shiftClip,
  trimClipStart,
  trimClipEnd,
  getActiveClipsAtTime,
  applyMagneticSnap,
  formatTimelineTimecode,
} from '../lib/editor/interactive-timeline.ts'

console.log('Running Timeline Interactive Text Clips Test (Gate 10)...')

// 1. Shift Clip Forward and Backward
const clipA = { startSec: 5.0, endSec: 8.0 }
const shiftedForward = shiftClip(clipA, 2.5, 30)
assert.equal(shiftedForward.startSec, 7.5, 'Should shift startSec forward by 2.5s')
assert.equal(shiftedForward.endSec, 10.5, 'Should shift endSec forward by 2.5s, maintaining 3.0s duration')
assert.equal(shiftedForward.snapped, false)

const shiftedBackward = shiftClip(clipA, -3.0, 30)
assert.equal(shiftedBackward.startSec, 2.0, 'Should shift startSec backward by 3.0s')
assert.equal(shiftedBackward.endSec, 5.0, 'Should shift endSec backward by 3.0s')

// 2. Boundary Clamping
const clampedToZero = shiftClip(clipA, -10.0, 30)
assert.equal(clampedToZero.startSec, 0, 'Start cannot be negative')
assert.equal(clampedToZero.endSec, 3.0, 'Duration must be preserved when clamped to 0')

const clampedToEnd = shiftClip(clipA, 50.0, 30)
assert.equal(clampedToEnd.endSec, 30, 'End cannot exceed totalDuration')
assert.equal(clampedToEnd.startSec, 27.0, 'Start must stay duration distance from end')

// 3. Magnetic Snapping
const snapPoints = [10.0, 15.0, 20.0]
const snappedShift = shiftClip(clipA, 4.9, 30, { snapPoints, snapThresholdSec: 0.2 })
assert.equal(snappedShift.startSec, 10.0, 'Should snap start to 10.0s')
assert.equal(snappedShift.endSec, 13.0, 'Should maintain duration when snapped')
assert.equal(snappedShift.snapped, true, 'snapped flag should be true')

// 4. Trim Left Edge (Start)
const trimmedStart = trimClipStart({ startSec: 4.0, endSec: 10.0 }, 6.0, 0.5)
assert.equal(trimmedStart.startSec, 6.0, 'Start should trim to 6.0s')
assert.equal(trimmedStart.endSec, 10.0, 'End should remain unchanged at 10.0s')

// Minimum duration constraint on left trim
const overtrimmedStart = trimClipStart({ startSec: 4.0, endSec: 10.0 }, 9.8, 0.5)
assert.equal(overtrimmedStart.startSec, 9.5, 'Start must not exceed endSec - minDuration (10.0 - 0.5 = 9.5)')
assert.equal(overtrimmedStart.endSec, 10.0)

// 5. Trim Right Edge (End)
const trimmedEnd = trimClipEnd({ startSec: 4.0, endSec: 10.0 }, 12.0, 30, 0.5)
assert.equal(trimmedEnd.startSec, 4.0, 'Start should remain unchanged at 4.0s')
assert.equal(trimmedEnd.endSec, 12.0, 'End should trim to 12.0s')

// Minimum duration constraint on right trim
const overtrimmedEnd = trimClipEnd({ startSec: 4.0, endSec: 10.0 }, 4.1, 30, 0.5)
assert.equal(overtrimmedEnd.startSec, 4.0)
assert.equal(overtrimmedEnd.endSec, 4.5, 'End must not fall below startSec + minDuration (4.0 + 0.5 = 4.5)')

// 6. Active Clips Query
const textClips = [
  { id: 'c1', trackId: 'text', startSec: 1.0, endSec: 4.0, text: 'First Headline', region: 'center' },
  { id: 'c2', trackId: 'text', startSec: 3.5, endSec: 7.0, text: 'Second Subtitle', region: 'bottom' },
  { id: 'c3', trackId: 'captions', startSec: 8.0, endSec: 12.0, text: 'Spoken transcript', isCut: false },
  { id: 'c4', trackId: 'captions', startSec: 12.0, endSec: 15.0, text: 'Cut pause', isCut: true },
]

const activeAt3 = getActiveClipsAtTime(textClips, 3.0)
assert.equal(activeAt3.length, 1)
assert.equal(activeAt3[0].id, 'c1')

const activeAt3_8 = getActiveClipsAtTime(textClips, 3.8)
assert.equal(activeAt3_8.length, 2, 'Both c1 and c2 should overlap at 3.8s')

const activeAt13 = getActiveClipsAtTime(textClips, 13.0)
assert.equal(activeAt13.length, 0, 'Cut clips must be excluded from active clips')

// 7. Timecode Formatting
assert.equal(formatTimelineTimecode(0), '00:00.00')
assert.equal(formatTimelineTimecode(65.5), '01:05.15')

console.log('timeline-interactive-text-clips: all checks passed')
