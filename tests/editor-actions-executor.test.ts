import assert from 'node:assert/strict'

import {
  applyEditorAction,
  applyEditorActionDrafts,
  parseEditorActionDraft,
  parseEditorActionDrafts,
  PROPOSE_NOT_APPLIED_MESSAGE,
  type EditorActionContext,
  type EditorActionDraft,
} from '@/lib/editor-actions'

function run() {
  // --- Validator: junk kinds and malformed payloads are rejected, not thrown
  assert.equal(parseEditorActionDraft({ kind: 'delete_everything' }), null)
  assert.equal(parseEditorActionDraft({ kind: 'seek', timeSec: -4 }), null)
  assert.equal(parseEditorActionDraft({ kind: 'seek' }), null)
  assert.equal(parseEditorActionDraft({ kind: 'preview_control', command: 'explode' }), null)
  assert.equal(parseEditorActionDraft({ kind: 'set_fit_mode', mode: 'stretch' }), null)
  assert.equal(parseEditorActionDraft({ kind: 'switch_tab', tab: 'Settings' }), null)
  assert.equal(parseEditorActionDraft({ kind: 'propose', description: '' }), null)
  assert.equal(parseEditorActionDraft('seek 0:25'), null)
  assert.equal(parseEditorActionDraft(null), null)

  // --- Validator: aliases, coercion, list wrapper, and cap
  const seek = parseEditorActionDraft({ kind: 'seek', seconds: '0:25' as unknown as number })
  assert.equal(seek, null, 'timecode strings are not numbers and must be rejected')
  const seekAliased = parseEditorActionDraft({ kind: 'seek', time_sec: 25.4, summary: 'Go to 0:25' })
  assert.ok(seekAliased && seekAliased.kind === 'seek' && seekAliased.timeSec === 25.4)

  const list = parseEditorActionDrafts({
    actions: [
      { kind: 'seek', timeSec: 12, summary: 'Jump to 0:12' },
      { kind: 'nonsense' },
      { kind: 'preview_control', command: 'play', summary: 'Play' },
    ],
  })
  assert.equal(list.length, 2)
  assert.deepEqual(list.map((draft) => draft.kind), ['seek', 'preview_control'])

  const capped = parseEditorActionDrafts(
    Array.from({ length: 10 }, (_, index) => ({
      kind: 'seek',
      timeSec: index,
      summary: `s${index}`,
    })),
  )
  assert.equal(capped.length, 6, 'draft lists are hard-capped')

  // --- Executor: seek clamps to known duration
  const seeks: number[] = []
  const ctx: EditorActionContext = {
    durationSec: 30,
    seek: (timeSec) => seeks.push(timeSec),
  }
  const overShoot = applyEditorAction({ kind: 'seek', timeSec: 99, summary: 'late' }, ctx)
  assert.equal(overShoot.applied, true)
  assert.deepEqual(seeks, [30])
  const underShoot = applyEditorAction({ kind: 'seek', timeSec: -2, summary: 'early' }, ctx)
  assert.equal(underShoot.applied, true)
  assert.deepEqual(seeks, [30, 0])

  // --- Executor: missing handlers fail soft instead of throwing
  const missing = applyEditorAction({ kind: 'set_fit_mode', mode: 'fit', summary: 'fit' }, {})
  assert.equal(missing.applied, false)
  assert.match(missing.message, /unavailable/)

  // --- Executor: preview control dispatches the right handler
  const calls: string[] = []
  const transport: EditorActionContext = {
    play: () => calls.push('play'),
    pause: () => calls.push('pause'),
    mute: () => calls.push('mute'),
    unmute: () => calls.push('unmute'),
  }
  for (const command of ['play', 'pause', 'mute', 'unmute'] as const) {
    const result = applyEditorAction({ kind: 'preview_control', command, summary: command }, transport)
    assert.equal(result.applied, true)
  }
  assert.deepEqual(calls, ['play', 'pause', 'mute', 'unmute'])

  // --- Executor: media-mutating proposals are plan-only, never faked
  const proposals: EditorActionDraft[] = [
    { kind: 'propose', description: 'Re-time the intro typography.', summary: 'Retype typography' },
    { kind: 'preview_control', command: 'pause', summary: 'Pause' },
  ]
  const results = applyEditorActionDrafts(proposals, transport)
  assert.equal(results.length, 2)
  assert.equal(results[0].applied, false)
  assert.equal(results[0].message, PROPOSE_NOT_APPLIED_MESSAGE)
  assert.equal(results[1].applied, true)

  // A throwing handler must not abort the rest of the draft
  const resultsAfterThrow = applyEditorActionDrafts(
    [
      { kind: 'seek', timeSec: 5, summary: 'boom' },
      { kind: 'preview_control', command: 'unmute', summary: 'sound on' },
    ],
    {
      seek: () => {
        throw new Error('video element gone')
      },
      unmute: () => calls.push('unmute-again'),
    },
  )
  assert.equal(resultsAfterThrow[0].applied, false)
  assert.equal(resultsAfterThrow[1].applied, true)
  assert.ok(calls.includes('unmute-again'))
}

run()
