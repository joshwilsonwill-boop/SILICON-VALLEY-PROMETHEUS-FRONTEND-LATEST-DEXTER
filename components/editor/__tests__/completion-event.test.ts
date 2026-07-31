import assert from 'node:assert/strict'
import test from 'node:test'

import {
  COMPLETION_EVENT_NAME,
  createCompletionEventDetail,
} from '../completion-event'

test('creates a completion event payload with a process-specific message', () => {
  assert.equal(COMPLETION_EVENT_NAME, 'prometheus:editor:process-complete')
  assert.deepEqual(
    createCompletionEventDetail({ process: 'video-animation' }),
    {
      process: 'video-animation',
      title: 'Animation complete',
      message: 'Your finished motion is ready to review.',
    },
  )
})

test('preserves optional completion copy supplied by a workflow', () => {
  assert.deepEqual(
    createCompletionEventDetail({
      process: 'export',
      title: 'Cut is ready',
      message: 'Your 4K master is prepared for download.',
    }),
    {
      process: 'export',
      title: 'Cut is ready',
      message: 'Your 4K master is prepared for download.',
    },
  )
})
