import test from 'node:test'
import assert from 'node:assert/strict'

import { createLocalChatHistoryStore } from '@/lib/prometheus-assistant/local-chat-history'
import { formatConversationLog } from '@/lib/conversation-log'

test('local chat history store tracks message counts per session', () => {
  const memoryStorage = new Map<string, string>()
  const store = createLocalChatHistoryStore({
    getItem: (key) => memoryStorage.get(key) ?? null,
    setItem: (key, value) => { memoryStorage.set(key, value) },
  }, 'test-user')

  const session1 = store.createSession('project-1', 'Session 1')
  const session2 = store.createSession('project-2', 'Session 2')

  store.insertMessage(session1.id, { role: 'user', content: 'Suggest a hook for this clip' })
  store.insertMessage(session1.id, { role: 'user', content: 'testing' })
  store.insertMessage(session1.id, { role: 'user', content: 'Please edit this video and give me the final edited MP4' })
  store.insertMessage(session1.id, { role: 'assistant', content: 'Here is the editorial plan...' })

  store.insertMessage(session2.id, { role: 'user', content: 'Pick a music mood' })
  store.insertMessage(session2.id, { role: 'assistant', content: 'Here are the recommended tempos...' })

  const counts = store.getMessageCounts()
  assert.equal(counts[session1.id], 4, 'Session 1 must have exactly 4 messages')
  assert.equal(counts[session2.id], 2, 'Session 2 must have exactly 2 messages')
})

test('local chat history store supports full-text search across session messages', () => {
  const memoryStorage = new Map<string, string>()
  const store = createLocalChatHistoryStore({
    getItem: (key) => memoryStorage.get(key) ?? null,
    setItem: (key, value) => { memoryStorage.set(key, value) },
  }, 'test-user')

  const session1 = store.createSession('project-1', 'Suggest a hook for this clip')
  const session2 = store.createSession('project-2', 'Pick a music mood')

  store.insertMessage(session1.id, { role: 'user', content: 'Suggest a hook for this clip' })
  store.insertMessage(session1.id, { role: 'user', content: 'testing' })
  store.insertMessage(session1.id, { role: 'user', content: 'Please edit this video and give me the final edited MP4' })
  store.insertMessage(session1.id, { role: 'assistant', content: 'Here is the editorial plan for MP4 export...' })

  store.insertMessage(session2.id, { role: 'user', content: 'Pick a music mood' })
  store.insertMessage(session2.id, { role: 'assistant', content: 'Tempo recommendations: 120 BPM upbeat' })

  // Search by text that only appears in message 3 of session 1 ("edited MP4")
  const resultsForMp4 = store.searchSessions('edited MP4')
  assert.equal(resultsForMp4.length, 1, 'Must find session 1 when searching for "edited MP4"')
  assert.equal(resultsForMp4[0].session.id, session1.id)
  assert.ok(resultsForMp4[0].matchSnippet?.includes('MP4'), 'Match snippet must contain search keyword')
  assert.equal(resultsForMp4[0].messageCount, 4)

  // Search by text in session 2 ("tempo")
  const resultsForTempo = store.searchSessions('tempo')
  assert.equal(resultsForTempo.length, 1, 'Must find session 2 when searching for "tempo"')
  assert.equal(resultsForTempo[0].session.id, session2.id)
  assert.equal(resultsForTempo[0].messageCount, 2)
})

test('formatConversationLog includes all messages in chronological order with sender attribution', () => {
  const turns = [
    { role: 'user' as const, text: 'Suggest a hook for this clip', timestamp: '2026-10-28T07:43:00.000Z' },
    { role: 'user' as const, text: 'testing', timestamp: '2026-10-28T07:44:00.000Z' },
    { role: 'user' as const, text: 'Please edit this video and give me the final edited MP4', timestamp: '2026-10-28T07:45:00.000Z' },
    { role: 'assistant' as const, text: 'The footage is currently queued. Choose options A-D. Final MP4 renders in Export.', timestamp: '2026-10-28T07:45:05.000Z' },
  ]

  const output = formatConversationLog(turns, 'mini_run_30s_master Chat')
  assert.ok(output.includes('mini_run_30s_master Chat'))
  assert.ok(output.includes('Suggest a hook for this clip'))
  assert.ok(output.includes('testing'))
  assert.ok(output.includes('Please edit this video and give me the final edited MP4'))
  assert.ok(output.includes('The footage is currently queued'))
  assert.ok(output.indexOf('Suggest a hook') < output.indexOf('testing'))
  assert.ok(output.indexOf('testing') < output.indexOf('Please edit this video'))
  assert.ok(output.indexOf('Please edit this video') < output.indexOf('The footage is currently queued'))
})

test('formatConversationLog includes failure status notes for orphan turns and custom assistant label', () => {
  const turns = [
    {
      role: 'user' as const,
      text: 'Suggest a hook for this clip',
      timestamp: '2026-10-28T07:43:00.000Z',
      statusNote: 'No assistant reply recorded for this turn (generation did not return a response)',
    },
    {
      role: 'user' as const,
      text: 'testing',
      timestamp: '2026-10-28T07:44:00.000Z',
      statusNote: 'No assistant reply recorded for this turn (generation did not return a response)',
    },
    {
      role: 'user' as const,
      text: 'Please edit this video and give me the final edited MP4',
      timestamp: '2026-10-28T07:45:00.000Z',
    },
    {
      role: 'assistant' as const,
      text: 'Options A-D staged. Final MP4 renders in Export.',
      timestamp: '2026-10-28T07:45:05.000Z',
    },
  ]

  const output = formatConversationLog(
    turns,
    'Prometheus Editorial Conversation',
    new Date('2026-10-28T18:54:28.000Z'),
    { assistantLabel: 'Prometheus Assistant' },
  )

  assert.ok(output.includes('Prometheus Editorial Conversation'))
  assert.ok(output.includes('Prometheus Assistant'))
  assert.ok(
    output.includes('[Status: No assistant reply recorded for this turn (generation did not return a response)]'),
    'Exported log must include explicit failure note under orphan turns',
  )
})

test('upsertSessions and searchSessions preserve message_count for older sessions without cached local messages', () => {
  const memoryStorage = new Map<string, string>()
  const store = createLocalChatHistoryStore({
    getItem: (key) => memoryStorage.get(key) ?? null,
    setItem: (key, value) => { memoryStorage.set(key, value) },
  }, 'test-user')

  // Simulate an older session from remote server with 2 messages, where messages are not yet in local storage
  store.upsertSessions([
    {
      id: 'session-older-aug27',
      user_id: 'user-1',
      project_id: 'project-mini-run',
      title: 'Pick a music mood',
      created_at: '2026-08-27T10:00:00.000Z',
      updated_at: '2026-08-27T10:05:00.000Z',
      message_count: 2,
    },
  ])

  const sessions = store.getProjectSessions('project-mini-run')
  assert.equal(sessions.length, 1)
  assert.equal(sessions[0].message_count, 2, 'Older session must retain message_count of 2')

  const searchResults = store.searchSessions('', 'project-mini-run')
  assert.equal(searchResults.length, 1)
  assert.equal(searchResults[0].messageCount, 2, 'Search results must retain messageCount of 2')
  assert.equal(searchResults[0].session.message_count, 2)
})
