import { describe, it, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import {
  performVoiceMusicAction,
  clearVoiceMusicRejectionHistory,
  getVoiceMusicRejectionHistory,
  recordVoiceMusicRejection,
  type VoiceMusicTrack,
} from '../lib/voice-companion/music-controls'

describe('collaborator music rejection memory (Gate 5)', () => {
  beforeEach(() => {
    clearVoiceMusicRejectionHistory()
  })

  const mockCatalog: VoiceMusicTrack[] = [
    { id: 'triumph', title: 'Triumph', genre: 'Cinematic', mood: 'Epic energetic' },
    { id: 'cinematic-trailer', title: 'Cinematic Trailer', genre: 'Cinematic', mood: 'High energetic cinematic' },
    { id: 'neon-drive', title: 'Neon Drive', genre: 'Synthwave', mood: 'Energetic' },
    { id: 'ambient-calm', title: 'Ambient Calm', genre: 'Ambient', mood: 'Peaceful' },
  ]

  const createMockHandlers = (currentTrackId: string | null = null) => {
    let activeTrackId = currentTrackId
    let stagedTrackId: string | null = null
    let currentTab = 'Motion'

    return {
      getMusicCatalog: () => mockCatalog,
      getActiveWorkspaceTab: () => currentTab,
      getMusicState: () => ({
        trackId: activeTrackId,
        title: activeTrackId ? mockCatalog.find(t => t.id === activeTrackId)?.title ?? null : null,
        volume: 20,
        muted: false,
        ducking: true,
      }),
      onTabChange: async (tab: string) => {
        currentTab = tab
      },
      onSelectMusicTrack: async (id: string) => {
        stagedTrackId = id
        activeTrackId = id
        return { success: true, staged: true, summary: `Staged ${id}` }
      },
      getStagedTrackId: () => stagedTrackId,
    }
  }

  it('records previous track in rejection history when replaced with a new one', async () => {
    const handlers = createMockHandlers('triumph')

    // Collaborator asks for another energetic track, passing excludeTrackId for triumph
    const result1 = await performVoiceMusicAction(
      { action: 'select', recommendation: true, query: 'energetic', excludeTrackId: 'triumph' },
      () => handlers as any,
    )

    assert.equal(result1.success, true)
    assert.equal(result1.trackId, 'cinematic-trailer')
    assert.ok(getVoiceMusicRejectionHistory().includes('triumph'))
  })

  it('prevents cycling back to earlier rejected track on subsequent recommendations', async () => {
    // Session starts with 'triumph' staged
    const handlers = createMockHandlers('triumph')

    // 1st rejection: replace triumph with cinematic-trailer
    const res1 = await performVoiceMusicAction(
      { action: 'select', recommendation: true, query: 'energetic', excludeTrackId: 'triumph' },
      () => handlers as any,
    )
    assert.equal(res1.trackId, 'cinematic-trailer')

    // 2nd rejection: collaborator dislikes cinematic-trailer too, asks for another energetic track.
    // Notice Jarvis only passes excludeTrackId: 'cinematic-trailer' here!
    // Without session memory, 'triumph' would have been chosen again because it matches query 'energetic'.
    const res2 = await performVoiceMusicAction(
      { action: 'select', recommendation: true, query: 'energetic', excludeTrackId: 'cinematic-trailer' },
      () => handlers as any,
    )

    // With memory, BOTH triumph and cinematic-trailer are excluded, so it advances to neon-drive!
    assert.equal(res2.trackId, 'neon-drive')
    const history = getVoiceMusicRejectionHistory()
    assert.ok(history.includes('triumph'), 'history should contain triumph')
    assert.ok(history.includes('cinematic-trailer'), 'history should contain cinematic-trailer')
  })

  it('supports explicit excludeTrackIds array parameter', async () => {
    const handlers = createMockHandlers(null)

    const res = await performVoiceMusicAction(
      { action: 'select', recommendation: true, query: 'energetic', excludeTrackIds: ['triumph', 'cinematic-trailer'] },
      () => handlers as any,
    )

    assert.equal(res.success, true)
    assert.equal(res.trackId, 'neon-drive')
    assert.ok(getVoiceMusicRejectionHistory().includes('triumph'))
    assert.ok(getVoiceMusicRejectionHistory().includes('cinematic-trailer'))
  })

  it('allows user to explicitly recall a previously rejected track by name', async () => {
    recordVoiceMusicRejection('triumph')
    assert.ok(getVoiceMusicRejectionHistory().includes('triumph'))

    const handlers = createMockHandlers('neon-drive')

    // User explicitly says "Actually, switch back to Triumph"
    const res = await performVoiceMusicAction(
      { action: 'select', trackName: 'Triumph' },
      () => handlers as any,
    )

    assert.equal(res.success, true)
    assert.equal(res.trackId, 'triumph')
    // Triumph was explicitly recalled, so it is cleared from rejection history
    assert.ok(!getVoiceMusicRejectionHistory().includes('triumph'))
  })
})
