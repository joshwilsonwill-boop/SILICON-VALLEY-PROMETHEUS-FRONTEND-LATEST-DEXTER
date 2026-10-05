import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { ensureVoiceTranscript } from '../lib/voice-companion/video-edit'
import { requestConfirmedTranscription } from '../lib/editor/request-transcription'

describe('transcript race condition & credit bypass protection (Gate 6)', () => {
  it('bypasses onRequestTranscription when timed transcript segments already exist', async () => {
    let requestedTranscriptionCalled = false

    const handlers = {
      hasVideo: true,
      projectId: 'proj-123',
      sourceAssetId: 'asset-456',
      transcriptSegments: [
        { id: '1', startMs: 0, endMs: 2500, text: 'Existing speech transcript.' },
      ],
      onRequestTranscription: async () => {
        requestedTranscriptionCalled = true
        return { success: true, pending: false, summary: 'Started new transcription' }
      },
    }

    const result = await ensureVoiceTranscript(() => handlers as any)
    assert.equal(result.success, true)
    assert.equal(requestedTranscriptionCalled, false, 'Must not trigger transcription if segments exist')
    assert.match(result.summary, /transcript is available/i)
  })

  it('bypasses onRequestTranscription when transcriptText already exists', async () => {
    let requestedTranscriptionCalled = false

    const handlers = {
      hasVideo: true,
      projectId: 'proj-123',
      sourceAssetId: 'asset-456',
      transcriptText: 'Full cached spoken transcript is here.',
      onRequestTranscription: async () => {
        requestedTranscriptionCalled = true
        return { success: true, pending: false, summary: 'Started new transcription' }
      },
    }

    const result = await ensureVoiceTranscript(() => handlers as any)
    assert.equal(result.success, true)
    assert.equal(requestedTranscriptionCalled, false, 'Must not trigger transcription if transcriptText exists')
  })

  it('calls onRequestTranscription only when no transcript exists', async () => {
    let requestedTranscriptionCalled = false

    const handlers = {
      hasVideo: true,
      projectId: 'proj-123',
      sourceAssetId: 'asset-456',
      transcriptSegments: [],
      transcriptText: '',
      onRequestTranscription: async () => {
        requestedTranscriptionCalled = true
        return { success: true, pending: true, summary: 'Transcription started.' }
      },
    }

    const result = await ensureVoiceTranscript(() => handlers as any)
    assert.equal(requestedTranscriptionCalled, true)
    assert.equal(result.pending, true)
  })

  it('does not append ?restart=1 when restart is false in requestConfirmedTranscription', async () => {
    let fetchedUrl = ''
    const mockFetcher = async (url: string, init?: RequestInit) => {
      if (url.includes('/api/exports/quote')) {
        return {
          ok: true,
          json: async () => ({ operation: 'transcribe', cost: 1, balance: 10, canAfford: true }),
        }
      }
      fetchedUrl = url
      return {
        ok: true,
        json: async () => ({ ok: true }),
      }
    }

    const started = await requestConfirmedTranscription('asset-789', {
      restart: false,
      fetcher: mockFetcher as any,
      confirm: () => true,
      newRequestId: () => 'req-1',
    })

    assert.equal(started, true)
    assert.equal(fetchedUrl, '/api/assets/asset-789/transcript')
    assert.ok(!fetchedUrl.includes('restart=1'), 'Must not include ?restart=1 when restart is false')
  })
})
