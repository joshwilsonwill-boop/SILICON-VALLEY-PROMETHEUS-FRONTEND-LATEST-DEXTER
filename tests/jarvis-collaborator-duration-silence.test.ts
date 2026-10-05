import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { optimizeSilenceCutsForTargetDuration } from '../lib/editor/silence-cuts'
import { performVoiceVideoEdit } from '../lib/voice-companion/video-edit'
import type { TranscriptSegment } from '../lib/types'

describe('duration-targeted silence optimization', () => {
  it('optimizes 33-second video down to 30 seconds by trimming pauses', () => {
    // A 33s video with three speech segments separated by pauses:
    // Seg 1: 0.0s - 10.0s
    // Pause: 10.0s - 11.5s (1.5s silence)
    // Seg 2: 11.5s - 22.0s
    // Pause: 22.0s - 23.8s (1.8s silence)
    // Seg 3: 23.8s - 33.0s
    // Total silence = 3.3s. Target is 30.0s (needed reduction = 3.0s).
    const segments: TranscriptSegment[] = [
      { id: '1', startMs: 0, endMs: 10000, text: 'First spoken thought here.' },
      { id: '2', startMs: 11500, endMs: 22000, text: 'Second spoken section here.' },
      { id: '3', startMs: 23800, endMs: 33000, text: 'Final concluding sentences.' },
    ]

    const result = optimizeSilenceCutsForTargetDuration(segments, 30, 33)
    assert.equal(result.achievable, true)
    assert.equal(result.targetDurationSec, 30)
    assert.equal(result.currentDurationSec, 33)
    assert.ok(result.totalRemovedSec >= 3.0)
    assert.ok(result.projectedDurationSec <= 30.0)
    assert.equal(result.cuts.length, 2)
    assert.match(result.summary, /Found.*pauses.*brings the video to/)
  })

  it('truthfully reports when pause cuts cannot reach massive reduction (99s to 30s)', () => {
    // A 99-second video with only 3 seconds of pauses
    const segments: TranscriptSegment[] = [
      { id: '1', startMs: 0, endMs: 48000, text: 'First long spoken segment.' },
      { id: '2', startMs: 49500, endMs: 97500, text: 'Second long spoken segment.' },
      { id: '3', startMs: 99000, endMs: 99000, text: 'Done.' },
    ]

    const result = optimizeSilenceCutsForTargetDuration(segments, 30, 99)
    assert.equal(result.achievable, false)
    assert.equal(result.targetDurationSec, 30)
    assert.equal(result.currentDurationSec, 99)
    assert.ok(result.totalRemovedSec < 10) // Only ~3s silence available
    assert.ok(result.projectedDurationSec > 90)
    assert.match(result.summary, /highlight extraction or trimming is recommended/)
  })

  it('handles already-short videos without unnecessary cuts', () => {
    const segments: TranscriptSegment[] = [
      { id: '1', startMs: 0, endMs: 20000, text: 'Already short.' },
    ]

    const result = optimizeSilenceCutsForTargetDuration(segments, 30, 20)
    assert.equal(result.achievable, true)
    assert.equal(result.totalRemovedSec, 0)
    assert.equal(result.cuts.length, 0)
    assert.match(result.summary, /already at or below/)
  })

  it('performVoiceVideoEdit propagates targetDurationSec to onCutSilence', async () => {
    let receivedThreshold: number | undefined
    let receivedTarget: number | undefined

    const mockHandlers = {
      hasVideo: true,
      projectId: 'proj-1',
      sourceAssetId: 'asset-1',
      transcriptSegments: [
        { id: '1', startMs: 0, endMs: 10000, text: 'Hello world' },
      ],
      onCutSilence: (threshold?: number, target?: number) => {
        receivedThreshold = threshold
        receivedTarget = target
        return {
          success: true,
          count: 2,
          totalRemovedSec: 3.2,
          ranges: [{ start: 10, end: 12 }],
          summary: 'Trimmed 3.2s of silence.',
        }
      },
    }

    const editResult = await performVoiceVideoEdit(
      { removePauses: true, targetDurationSec: 30 },
      () => mockHandlers as any,
    )

    assert.equal(editResult.success, true)
    assert.equal(receivedThreshold, 0.4)
    assert.equal(receivedTarget, 30)
  })
})
