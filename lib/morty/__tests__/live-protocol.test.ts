import test from 'node:test'
import assert from 'node:assert/strict'

import {
  initialMortyLiveState,
  mortyLiveReducer,
  parseGeminiLiveMessage,
} from '../live-protocol'

test('replaces partial live transcripts with the cumulative text on each event', () => {
  const first = mortyLiveReducer(initialMortyLiveState, {
    type: 'provider_event',
    event: parseGeminiLiveMessage({ serverContent: { inputTranscription: { text: 'make the' } } }),
  })
  // Gemini Live sends the *full* partial transcript so far on each event —
  // the later value must replace, not append to, the earlier one.
  const second = mortyLiveReducer(first, {
    type: 'provider_event',
    event: parseGeminiLiveMessage({ serverContent: { inputTranscription: { text: 'make the hook sharper' } } }),
  })

  assert.equal(first.liveUserTranscript, 'make the')
  assert.equal(second.liveUserTranscript, 'make the hook sharper')
})

test('user activity interrupts scheduled output state', () => {
  const next = mortyLiveReducer(
    { ...initialMortyLiveState, phase: 'speaking', scheduledOutput: true },
    { type: 'user_activity_started' },
  )

  assert.equal(next.phase, 'listening')
  assert.equal(next.scheduledOutput, false)
  assert.equal(next.interrupted, true)
})

test('permits three reconnect attempts then reports a terminal error', () => {
  let state = { ...initialMortyLiveState, phase: 'reconnecting' as const }
  for (let attempt = 0; attempt < 3; attempt += 1) {
    state = mortyLiveReducer(state, { type: 'reconnect_failed' })
  }

  assert.equal(state.phase, 'error')
  assert.match(state.error ?? '', /reconnect/i)
})
