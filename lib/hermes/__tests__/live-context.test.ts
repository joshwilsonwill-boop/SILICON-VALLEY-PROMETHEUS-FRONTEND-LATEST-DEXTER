import test from 'node:test'
import assert from 'node:assert/strict'

import { InMemoryHermesMemoryStore, type HermesMemoryEntry } from '../memory'
import { buildMortyLiveTokenRequest, createMortyLiveSessionContext } from '../live-context'

test('builds Live instructions from Morty identity and recalled memory', async () => {
  const memoryStore = new InMemoryHermesMemoryStore()
  const entry: HermesMemoryEntry = {
    id: 'user-1:one',
    userId: 'user-1',
    sessionId: 'earlier',
    text: 'The operator prefers concise cuts with a sharp 9:16 hook.',
    kind: 'preference',
    createdAt: '2026-01-01T00:00:00.000Z',
    lastTouchedAt: '2026-01-01T00:00:00.000Z',
  }
  await memoryStore.save('user-1', [entry])

  const context = await createMortyLiveSessionContext({
    userId: 'user-1',
    sessionId: 'live-1',
    memoryStore,
    contextQuery: 'Make the 9:16 hook concise',
  })

  assert.match(context.instructions, /You are Morty/i)
  assert.match(context.instructions, /prefers concise cuts/i)
})

test('constrains a single Live token to audio and Morty tools', () => {
  const request = buildMortyLiveTokenRequest({
    instructions: 'You are Morty.',
    now: new Date('2026-01-01T00:00:00.000Z'),
  }) as Record<string, unknown>
  const constraints = request.liveConnectConstraints as Record<string, unknown>
  const config = constraints.config as Record<string, unknown>

  assert.equal(request.uses, 1)
  assert.deepEqual(config.responseModalities, ['AUDIO'])
  assert.equal(typeof constraints.model, 'string')
  assert.ok(Array.isArray(config.tools))
})
