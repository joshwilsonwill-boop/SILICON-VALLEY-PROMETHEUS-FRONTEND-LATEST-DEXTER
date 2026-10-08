import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import test from 'node:test'
import ts from 'typescript'

const page = readFileSync('app/editor/[id]/page.tsx', 'utf8')

// Execute the actual editor callback with isolated browser/network dependencies.
function editorSubmit(snapshot) {
  const source = page.slice(page.indexOf('  const startProjectRender ='), page.indexOf('  const handleVoiceStartRender ='))
  const js = ts.transpile(source, {target: ts.ScriptTarget.ES2022})
  const requests = []
  const callback = new Function('React', 'project', 'projectId', 'getEditorialTimelineController', 'fetch', 'toast', 'setLatestExport', 'setActiveWorkspaceTab', 'setDeliveryOpenToken', `${js}; return startProjectRender;`)(
    {useCallback: (fn) => fn}, {sourceAssetId: 'source-1'}, 'project-1',
    () => ({getSnapshot: () => snapshot}),
    async (url, options) => {requests.push({url, body: JSON.parse(options.body)}); return {ok: true, json: async () => ({export: {id: 'export-1', status: 'pending'}})}},
    {error() {}, success() {}}, () => {}, () => {}, () => {},
  )
  return {callback, requests}
}

for (const snapshot of [
  {status: 'error', timeline: {sourceAssetId: 'source-1', revision: 3}, error: 'Timeline sync failed'},
  {status: 'loading', timeline: null},
  {status: 'saved', timeline: {sourceAssetId: 'previous-source', revision: 2}},
]) {
  test(`source Mini-Run submits without a timeline prerequisite: ${snapshot.status}`, async () => {
    const {callback, requests} = editorSubmit(snapshot)
    const result = await callback()
    assert.equal(result.success, true, result.summary)
    assert.equal(requests.length, 1)
    assert.deepEqual(requests[0].body, {preset: 'mini-run-maul-portrait', sourceAssetId: 'source-1'})
  })
}
