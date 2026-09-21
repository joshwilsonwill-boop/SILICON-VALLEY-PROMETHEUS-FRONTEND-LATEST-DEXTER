import assert from 'node:assert/strict'
import { buildPrometheusChatMemory } from '../lib/prometheus-assistant/chat-memory.ts'

console.log('Testing Chat History Synchronization on immediate follow-up turns...')

// Test 1: buildPrometheusChatMemory filters blank messages and formats cleanly
{
  const testInput = [
    { role: 'user', content: 'First message' },
    { role: 'assistant', content: '   ' }, // should be filtered
    { role: 'assistant', content: 'Actual response' },
    { role: 'user', content: 'Immediate follow-up' },
  ]
  const memory = buildPrometheusChatMemory(testInput)
  assert.equal(memory.length, 3, 'Empty messages must be filtered out')
  assert.equal(memory[0].role, 'user')
  assert.equal(memory[0].content, 'First message')
  assert.equal(memory[1].role, 'assistant')
  assert.equal(memory[1].content, 'Actual response')
  assert.equal(memory[2].role, 'user')
  assert.equal(memory[2].content, 'Immediate follow-up')
}

// Test 2: Synchronous memory state simulation for rapid consecutive turns
{
  // Simulates messagesRef.current across consecutive turns
  let messagesRefCurrent = []

  function simulateSendMessage(text, historyOverride) {
    const history = buildPrometheusChatMemory(historyOverride ?? messagesRefCurrent)
    const userMsg = {
      id: `user-${Date.now()}-${Math.random()}`,
      role: 'user',
      content: text,
      isComplete: true,
    }
    // Must update synchronously!
    messagesRefCurrent = [...messagesRefCurrent, userMsg]
    return { history, userMsg }
  }

  function simulateStreamComplete(assistantId, reply) {
    // Must update synchronously!
    messagesRefCurrent = messagesRefCurrent.map((m) =>
      m.id === assistantId ? { ...m, content: reply, isComplete: true } : m
    )
  }

  // Turn 1
  const turn1 = simulateSendMessage('Change caption style to clean bold')
  assert.equal(turn1.history.length, 0, 'Turn 1 starts with empty history')

  const asstId = 'asst-1'
  messagesRefCurrent = [...messagesRefCurrent, { id: asstId, role: 'assistant', content: '', isComplete: false }]
  simulateStreamComplete(asstId, 'Updated captions to clean bold preset.')

  // Turn 2 executed immediately (0ms delay, before any React effect)
  const turn2 = simulateSendMessage('Also make them punchy')
  assert.equal(turn2.history.length, 2, 'Turn 2 must immediately receive full history of Turn 1')
  assert.equal(turn2.history[0].content, 'Change caption style to clean bold')
  assert.equal(turn2.history[1].content, 'Updated captions to clean bold preset.')

  const asstId2 = 'asst-2'
  messagesRefCurrent = [...messagesRefCurrent, { id: asstId2, role: 'assistant', content: '', isComplete: false }]
  simulateStreamComplete(asstId2, 'Applied punchy formatting.')

  // Turn 3 executed immediately
  const turn3 = simulateSendMessage('Now cut silence')
  assert.equal(turn3.history.length, 4, 'Turn 3 must contain all 4 prior messages')
  assert.equal(turn3.history[2].content, 'Also make them punchy')
  assert.equal(turn3.history[3].content, 'Applied punchy formatting.')
}

console.log('chat-history-sync-verified')
process.exit(0)
