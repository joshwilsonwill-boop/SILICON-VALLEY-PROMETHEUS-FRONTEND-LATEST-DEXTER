import assert from 'node:assert/strict'
import {
  generateWaveformBars,
  getActiveClipsAtTime,
  formatTimelineTimecode,
} from '../lib/editor/interactive-timeline.ts'

console.log('Running Cinematic Multi-Track Timeline Sync Test (Gate 11)...')

// 1. Time-to-Pixel and Coordinate Mapping
const duration = 45.0 // 45 seconds timeline

function timeToPercent(timeSec, totalDuration) {
  return Math.min(100, Math.max(0, (timeSec / Math.max(0.001, totalDuration)) * 100))
}

function percentToTime(percent, totalDuration) {
  return (Math.min(100, Math.max(0, percent)) / 100) * totalDuration
}

assert.equal(Math.round(timeToPercent(0, duration)), 0)
assert.equal(Math.round(timeToPercent(22.5, duration)), 50)
assert.equal(Math.round(timeToPercent(45.0, duration)), 100)

assert.equal(percentToTime(0, duration), 0)
assert.equal(percentToTime(50, duration), 22.5)
assert.equal(percentToTime(100, duration), 45.0)

// 2. Waveform Bar Generation & Normalization
const waveform = generateWaveformBars(duration, 64)
assert.equal(waveform.length, 64, 'Must generate requested number of bars')
waveform.forEach((bar, idx) => {
  assert.ok(bar >= 0.1 && bar <= 1.0, `Waveform bar ${idx} value (${bar}) must be bounded in [0.1, 1.0]`)
})

// 3. Multi-Track Active Clip Synchronization
const sampleClips = [
  { id: 'txt-1', trackId: 'text', startSec: 2.0, endSec: 6.0, text: 'Opening Hook', region: 'center' },
  { id: 'txt-2', trackId: 'text', startSec: 10.0, endSec: 15.0, text: 'Feature Callout', region: 'bottom' },
  { id: 'cap-1', trackId: 'captions', startSec: 1.5, endSec: 4.5, text: 'Welcome everyone', isCut: false },
  { id: 'cap-2', trackId: 'captions', startSec: 5.0, endSec: 7.0, text: 'to the future', isCut: false },
  { id: 'cap-3', trackId: 'captions', startSec: 7.0, endSec: 9.0, text: 'um uh', isCut: true }, // cut silence
]

// At t = 3.0s: both txt-1 and cap-1 should be active
const activeAt3 = getActiveClipsAtTime(sampleClips, 3.0)
assert.equal(activeAt3.length, 2)
assert.deepEqual(activeAt3.map(c => c.id).sort(), ['cap-1', 'txt-1'])

// At t = 8.0s: cap-3 is cut, so zero active clips
const activeAt8 = getActiveClipsAtTime(sampleClips, 8.0)
assert.equal(activeAt8.length, 0, 'Cut segments must not be active')

// At t = 12.0s: only txt-2 active
const activeAt12 = getActiveClipsAtTime(sampleClips, 12.0)
assert.equal(activeAt12.length, 1)
assert.equal(activeAt12[0].id, 'txt-2')

// 4. Cut Ranges Geometry
const cutRanges = [
  { start: 7.0, end: 9.0 },
  { start: 20.0, end: 24.0 },
]

const cut1StartPct = timeToPercent(cutRanges[0].start, duration)
const cut1WidthPct = timeToPercent(cutRanges[0].end - cutRanges[0].start, duration)

assert.equal(Math.round(cut1StartPct), 16) // 7 / 45 = 15.55%
assert.equal(Math.round(cut1WidthPct), 4)  // 2 / 45 = 4.44%

// 5. Timecode Formatting Precision
assert.equal(formatTimelineTimecode(0), '00:00.00')
assert.equal(formatTimelineTimecode(60), '01:00.00')
assert.equal(formatTimelineTimecode(92.4), '01:32.12')

console.log('timeline-cinematic-multitrack-sync: all checks passed')
