import test from 'node:test'
import assert from 'node:assert/strict'

import {
  buildMortyRequest,
  initialMortyConversation,
  mortyConversationReducer,
  normalizeMortyResult,
} from '../conversation'

test('submitting a transcript enters thinking with a pending request', () => {
  const next = mortyConversationReducer(initialMortyConversation, {
    type: 'submit',
    transcript: 'Find my latest source video',
  })
  assert.equal(next.status, 'thinking')
  assert.equal(next.pendingTranscript, 'Find my latest source video')
})

test('a result appends both turns and returns to idle', () => {
  const next = mortyConversationReducer(
    { ...initialMortyConversation, status: 'thinking', pendingTranscript: 'Hello' },
    { type: 'result', result: { reply: 'Hello. I am Morty.', intent: 'chat', toolCalls: [], sources: [] } },
  )
  assert.equal(next.status, 'idle')
  assert.deepEqual(next.messages, [
    { role: 'user', content: 'Hello' },
    { role: 'assistant', content: 'Hello. I am Morty.', intent: 'chat', toolCalls: [], sources: [] },
  ])
})

test('malformed API payload becomes a recoverable error', () => {
  assert.throws(() => normalizeMortyResult({ reply: 42 }), /invalid Morty response/i)
})

test('builds a stable agent request with prior turns', () => {
  assert.deepEqual(buildMortyRequest('Make a short', [{ role: 'user', content: 'Use my brand' }], 'session-1'), {
    transcript: 'Make a short',
    messages: [{ role: 'user', content: 'Use my brand' }],
    sessionId: 'session-1',
  })
})
