import assert from 'node:assert/strict'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { createRequire } from 'node:module'
import { readFileSync } from 'node:fs'
const require = createRequire(import.meta.url)
const { useAutonomousStore } = require('../lib/autonomous-ui/autonomous-store.ts')
const { getActionTargetBox, getReceiptMetrics } = require('../components/editor/autonomous/action-feedback.ts')
const { JarvisConversationPanel } = require('../components/editor/autonomous/jarvis-conversation-panel.tsx')
const { formatConversationLog } = require('../lib/conversation-log.ts')

const store = () => useAutonomousStore.getState()
store().clearActionHistory()
let operationResolve
const operation = new Promise((resolve) => { operationResolve = resolve })
const actionId = store().beginAction({ label: 'Remove pauses', targetLabel: 'Motion timeline' })
assert.equal(store().actions[0].status, 'running')
const completing = operation.then((result) => store().finishAction(actionId, result))
assert.equal(store().actions[0].status, 'running', 'Starting or waiting cannot fabricate success')
const rect = { left: 32, top: 96, width: 200, height: 56 }
store().setActionTarget(actionId, rect)
assert.deepEqual(getActionTargetBox(null, store().actions[0], { width: 390, height: 844 }), { left: 29, top: 93, width: 206, height: 62 })
operationResolve({ status: 'succeeded', summary: 'Removed 3 pauses from the timeline.', affectedCount: 3, durationRemovedSec: 2.74 })
await completing
assert.equal(store().actions[0].status, 'succeeded')
assert.equal(store().activeActionId, null)
assert.equal(store().actions[0].affectedCount, 3)
assert.equal(store().actions[0].durationRemovedSec, 2.74)
assert.match(getReceiptMetrics(store().actions[0]), /3 affected.*2.74s removed/)
store().clearCallbacks()
assert.equal(store().actions.length, 1, 'Ending callback registration must retain receipts')
store().finishAction(actionId, { status: 'failed', summary: 'duplicate late event' })
assert.equal(store().actions[0].status, 'succeeded', 'Settled outcomes are immutable')
store().beginAction({ id: actionId, label: 'duplicate start' })
assert.equal(store().actions.length, 1)
store().finishAction('unknown', { status: 'succeeded', summary: 'unexpected' })
assert.equal(store().actions.length, 1)

for (const status of ['failed', 'partial', 'cancelled']) {
  const id = store().beginAction({ label: status })
  store().finishAction(id, { status, summary: status + ' result', affectedCount: 0 })
  assert.equal(store().actions.at(-1).status, status)
  assert.equal(store().actions.at(-1).affectedCount, 0)
}
const concurrent = store().beginAction({ label: 'First pending' })
const concurrentSecond = store().beginAction({ label: 'Second pending' })
store().finishAction(concurrentSecond, { status: 'failed', summary: 'Did not change the edit' })
assert.equal(store().activeActionId, concurrent)
for (let index = 0; index < 55; index++) {
  const id = store().beginAction({ label: 'Receipt ' + index })
  store().finishAction(id, { status: 'succeeded', summary: 'Saved result ' + index })
}
assert.equal(store().actions.filter((action) => action.status !== 'running').length, 50)
assert.equal(store().actions.find((action) => action.id === concurrent).status, 'running')
store().finishAction(concurrent, { status: 'cancelled', summary: 'Stopped before applying', affectedCount: Number.NaN })
assert.equal(store().actions.some((action) => action.id === concurrent), false, 'The oldest completed receipt rolls off after the history cap')
const sanitized = store().beginAction({ label: 'Sanitize metrics' })
store().finishAction(sanitized, { status: 'cancelled', summary: 'Stopped', affectedCount: Number.NaN })
assert.equal(store().actions.find((action) => action.id === sanitized).affectedCount, undefined)
store().clearActionHistory()

const viewport = { width: 390, height: 844 }
const state = { visible: true, pillMode: 'action', activeTargetRect: rect, anticipatedTargetRect: null, isTakeover: true }
assert.ok(getActionTargetBox(state, undefined, viewport))
assert.equal(getActionTargetBox({ ...state, visible: false }, undefined, viewport), null)
assert.equal(getActionTargetBox({ ...state, pillMode: 'idle' }, undefined, viewport), null)
assert.equal(getActionTargetBox({ ...state, activeTargetRect: { left: 0, top: 0, width: 390, height: 844 } }, undefined, viewport), null)
assert.equal(getActionTargetBox({ ...state, activeTargetRect: { ...rect, left: 999 } }, undefined, viewport), null)
assert.equal(getActionTargetBox({ ...state, activeTargetRect: { ...rect, width: 0 } }, undefined, viewport), null)
assert.equal(getActionTargetBox({ ...state, activeTargetRect: { ...rect, top: Number.NaN } }, undefined, viewport), null)
assert.ok(getActionTargetBox({ ...state, activeTargetRect: { ...rect, left: -10 } }, undefined, viewport))

const longReply = 'I removed three pauses and kept your dialogue in order. '.repeat(40) + 'END OF FULL REPLY'
const turns = [
  { id: 'u1', role: 'user', text: 'Remove the pauses.', timestamp: 100, status: 'complete' },
  { id: 'a1', role: 'assistant', text: longReply, timestamp: 110, status: 'complete' },
  { id: 'a2', role: 'assistant', text: 'This next explanation was interrupted.', timestamp: 120, status: 'interrupted' },
  { id: 'a3', role: 'assistant', text: 'Only the received part is available.', timestamp: 130, status: 'partial' },
]
const props = {
  transcripts: turns, status: 'error', connectionNotice: 'Connection interrupted. Your conversation is saved.',
  error: 'network disconnected', canReplayResponse: true, reconnect: async () => {},
  replayLastResponse: async () => {}, sendTextMessage: () => {}, onClose: () => {},
  getCapturedAudio: () => new Blob([new Uint8Array([1,2,3])], {type:'audio/wav'}),
  isMuted: false, toggleMute: () => {}, disconnect: () => {}, isEditorLinked: true,
  editingEnabled: false, toggleEditing: () => {},
}
const markup = renderToStaticMarkup(React.createElement(JarvisConversationPanel, props))
assert.ok(markup.includes(longReply), 'Every character of the received reply must render')
assert.match(markup, /Connection interrupted. Your conversation is saved/)
assert.match(markup, /Reconnect/)
assert.match(markup, /Replay received reply/)
assert.match(markup, /Download conversation/)
assert.match(markup, /Download mic audio/)
assert.match(markup, /Interrupted · received text kept/)
assert.match(markup, /Incomplete · received text kept/)
assert.doesNotMatch(markup, /line-clamp/)
assert.match(formatConversationLog(turns), /END OF FULL REPLY/)
assert.match(formatConversationLog(turns), /Remove the pauses/)

const layerSource = readFileSync(new URL('../components/editor/autonomous/agentic-cursor-layer.tsx', import.meta.url), 'utf8')
assert.doesNotMatch(layerSource, /Agent3DCursor|AgentTakeoverScrim|AgentViewportMovingBorder|ClickShockwave/)
console.log('jarvis-action-feedback passed')
