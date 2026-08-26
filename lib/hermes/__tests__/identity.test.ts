import test from 'node:test'
import assert from 'node:assert/strict'

import { HERMES_IDENTITY, hermesSystemPrompt } from '../identity'

test('exposes Morty while retaining the Hermes compatibility id', () => {
  assert.equal(HERMES_IDENTITY.name, 'Morty')
  assert.equal(HERMES_IDENTITY.id, 'hermes')
  assert.match(hermesSystemPrompt(), /You are Morty/i)
})
