import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import test from 'node:test'
import ts from 'typescript'
import {createRequire} from 'node:module'
import React from 'react'
import {renderToStaticMarkup} from 'react-dom/server'

const require = createRequire(import.meta.url)
const {readVoiceExportStatus} = require('../lib/voice-companion/export-status.ts')

const page = readFileSync('app/editor/[id]/page.tsx', 'utf8')

// Execute the actual editor callback with isolated browser/network dependencies.
function editorSubmit(snapshot, payload = {export: {id: 'export-1', status: 'pending'}}, ok = true) {
  const source = page.slice(page.indexOf('  const startProjectRender ='), page.indexOf('  const handleVoiceStartRender ='))
  const js = ts.transpile(source, {target: ts.ScriptTarget.ES2022})
  const requests = []
  const callback = new Function('React', 'project', 'projectId', 'getEditorialTimelineController', 'fetch', 'toast', 'setLatestExport', 'setActiveWorkspaceTab', 'setDeliveryOpenToken', `${js}; return startProjectRender;`)(
    {useCallback: (fn) => fn}, {sourceAssetId: 'source-1'}, 'project-1',
    () => ({getSnapshot: () => snapshot}),
    async (url, options) => {requests.push({url, body: JSON.parse(options.body)}); if (payload instanceof Error) throw payload; return {ok, json: async () => payload}},
    {error() {}, success() {}}, () => {}, () => {}, () => {},
  )
  return {callback, requests}
}

for (const snapshot of [
  {status: 'error', timeline: {sourceAssetId: 'source-1', revision: 3}, error: 'Timeline sync failed'},
  {status: 'loading', timeline: null},
  {status: 'saving', timeline: {sourceAssetId: 'source-1', revision: 4}},
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

test('editor submission reports rejected and missing receipts as failures', async () => {
  for (const [payload, ok, expected] of [
    [{error: 'Source unavailable'}, false, /Source unavailable/],
    [{export: {status: 'pending'}}, true, /without a tracked render job/],
    [{export: {id: 'rejected', status: 'failed', errorMessage: 'Worker unavailable'}}, true, /Worker unavailable/],
  ]) {
    const {callback} = editorSubmit({status: 'saved'}, payload, ok)
    const result = await callback()
    assert.equal(result.success, false)
    assert.match(result.summary, expected)
  }
})

test('a submission timeout does not falsely claim the backend rejected the job', async () => {
  const {callback} = editorSubmit({status: 'saved'}, new DOMException('Timed out', 'TimeoutError'))
  const result = await callback()
  assert.equal(result.success, false)
  assert.match(result.summary, /Check MP4 status before retrying.*may already have accepted/)
})

function loadModule(path, mocks) {
  const js = ts.transpileModule(readFileSync(path, 'utf8'), {compilerOptions: {
    target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true,
  }}).outputText
  const module = {exports: {}}
  new Function('require', 'module', 'exports', js)((id) => id in mocks ? mocks[id] : require(id), module, module.exports)
  return module.exports
}

function exportRoute({user = {id: 'user-1'}, projectSource = 'source-1'} = {}) {
  const dispatches = []
  const supabase = {
    auth: {getUser: async () => ({data: {user}})},
    from(table) {
      const chain = {
        select() {return chain}, eq() {return chain}, update() {return chain},
        async maybeSingle() {return {data: table === 'projects'
          ? {id: 'project-1', source_asset_id: projectSource, editor_state: {editorialTimeline: {revision: 9}}}
          : {id: 'source-1', storage_path: 'source.mp4'}}},
        async single() {return {data: {status: 'pending', metadata: {miniRunJobId: 'job-1'}}}},
      }
      return chain
    },
  }
  const {POST} = loadModule('app/api/projects/[id]/exports/route.ts', {
    'next/server': {NextResponse: {json: (body, options) => ({body, status: options?.status ?? 200})}},
    '@/lib/supabase/server': {createClient: async () => supabase},
    '@/lib/exports/service': {ExportService: {
      findActiveProjectExport: async () => null,
      createProjectExport: async (_id, options) => ({id: 'export-1', metadata: options.metadata}),
    }},
    '@/lib/server/mini-run-dispatch': {dispatchMiniRunRender: async (input) => {dispatches.push(input); return {jobId: 'job-1', status: 'queued'}}},
    '@/lib/server/mini-run-proxy': {resolveMiniRunConfig: () => ({})},
  })
  return {dispatches, submit: (body) => POST({json: async () => body}, {params: Promise.resolve({id: 'project-1'})})}
}

test('API accepts a stale informational revision for source output', async () => {
  const route = exportRoute()
  const result = await route.submit({sourceAssetId: 'source-1', editorialRevision: 2})
  assert.equal(result.status, 202)
  assert.equal(result.body.export.id, 'export-1')
  assert.equal(route.dispatches.length, 1)
  assert.equal(route.dispatches[0].request.sourceAssetId, 'source-1')
})

test('API still enforces authentication, current source, and valid input', async () => {
  for (const [options, body, status] of [
    [{user: null}, {sourceAssetId: 'source-1'}, 401],
    [{projectSource: 'source-2'}, {sourceAssetId: 'source-1'}, 409],
    [{}, {sourceAssetId: 'source-1', editorialRevision: -1}, 400],
    [{}, {}, 400],
  ]) {
    const route = exportRoute(options)
    assert.equal((await route.submit(body)).status, status)
    assert.equal(route.dispatches.length, 0)
  }
})

const bridge = {
  projectId: 'project-1', sourceAssetId: 'source-1', hasVideo: true,
  getTimelineSyncState: () => ({status: 'error', error: 'Timeline request failed', revision: 2, sourceAssetId: 'source-1'}),
}
const receipt = {
  id: 'export-1', projectId: 'project-1', userId: 'user-1', status: 'pending',
  mimeType: 'video/mp4', createdAt: '2026-10-08T21:00:00Z', updatedAt: '2026-10-08T21:00:00Z',
  metadata: {sourceAssetId: 'source-1', outputKind: 'mini-run', timelineApplied: false, miniRunJobId: 'job-1'},
}
const historyFetch = (records) => async () => ({ok: true, json: async () => ({exports: records})})

test('status separates sync errors from no submitted job and filters other sources', async () => {
  const result = await readVoiceExportStatus(() => bridge, historyFetch([
    {...receipt, metadata: {...receipt.metadata, sourceAssetId: 'other-source'}},
    {...receipt, projectId: 'other-project'},
  ]))
  assert.equal(result.phase, 'not_submitted')
  assert.equal(result.renderInitiated, false)
  assert.equal(result.timelineSync.error, 'Timeline request failed')
})

test('status reports queued, processing, failed, and completed receipts truthfully', async () => {
  for (const status of ['pending', 'processing', 'failed', 'completed']) {
    const result = await readVoiceExportStatus(() => bridge, historyFetch([{...receipt, status, errorMessage: status === 'failed' ? 'Worker crashed' : null}]))
    assert.equal(result.phase, status)
    assert.equal(result.exportId, 'export-1')
    assert.equal(result.progressPercent, null)
    assert.equal(result.timelineApplied, false)
    assert.equal(Boolean(result.previewUrl), status === 'completed')
    assert.equal(Boolean(result.downloadEndpoint), status === 'completed')
    if (status === 'failed') assert.match(result.summary, /Worker crashed.*No automatic retry/)
  }
})

test('status accepts only a finite percentage within the backend range', async () => {
  for (const value of [42, null, '50', NaN, Infinity, -10, 120]) {
    const result = await readVoiceExportStatus(() => bridge, historyFetch([
      {...receipt, status: 'processing', metadata: {...receipt.metadata, progressPercent: value}},
    ]))
    assert.equal(result.progressPercent, value === 42 ? 42 : null)
  }
})

test('completed without a playable receipt is still finalizing', async () => {
  const result = await readVoiceExportStatus(() => bridge, historyFetch([
    {...receipt, status: 'completed', metadata: {sourceAssetId: 'source-1'}},
  ]))
  assert.equal(result.phase, 'finalizing')
  assert.equal(result.previewUrl, undefined)
})

test('status failures and project changes never imply work or completion', async () => {
  for (const fetchImpl of [
    async () => {throw new Error('Network unavailable')},
    async () => ({ok: false, json: async () => ({error: 'Unauthorized'})}),
    async () => ({ok: true, json: async () => ({})}),
  ]) {
    const result = await readVoiceExportStatus(() => bridge, fetchImpl)
    assert.equal(result.success, false)
    assert.equal(result.renderInitiated, undefined)
  }
  let current = bridge
  const result = await readVoiceExportStatus(() => current, async () => {
    current = {...bridge, sourceAssetId: 'replacement'}
    return {ok: true, json: async () => ({exports: [receipt]})}
  })
  assert.equal(result.success, false)
  assert.match(result.error, /source changed/)
})

test('voice executor exposes current sync and refreshes job history through the tool', async () => {
  const hook = readFileSync('hooks/use-voice-companion.ts', 'utf8')
  const source = hook.slice(hook.indexOf('  const executeToolCall ='), hook.indexOf('  const handleToolCall:'))
  const js = ts.transpile(source, {target: ts.ScriptTarget.ES2022})
  const execute = new Function('useCallback', 'handlersRef', 'readVoiceExportStatus', `${js}; return executeToolCall;`)(
    (fn) => fn, {current: bridge}, (getBridge) => readVoiceExportStatus(getBridge, historyFetch([receipt])),
  )
  assert.equal((await execute('get_editor_state', {}, () => true)).timelineSync.status, 'error')
  assert.equal((await execute('get_export_status', {}, () => true)).phase, 'pending')
  assert.equal((await execute('get_export_status', {}, () => false)).success, false)
})

test('delivery studio displays completed source MP4 and enables export despite a sync error', () => {
  let stateIndex = 0
  const {EditorialDeliveryStudio} = loadModule('components/editor/editorial-delivery-studio.tsx', {
    react: {...React, useState: (initial) => [stateIndex++ === 0 ? [{...receipt, status: 'completed'}] : initial, () => {}]},
    'framer-motion': {useReducedMotion: () => true, motion: new Proxy({}, {get: (_target, key) => key})},
    '@/hooks/use-editorial-timeline': {useEditorialTimeline: () => ({status: 'error', error: 'Timeline request failed', timeline: null})},
  })
  const html = renderToStaticMarkup(React.createElement(EditorialDeliveryStudio, {
    projectId: 'project-1', sourceAssetId: 'source-1', sourceUrl: '/source.mp4', projectTitle: 'Test', currentTimeSec: 0, durationSec: 10,
  }))
  assert.match(html, /\/api\/exports\/export-1\/preview/)
  assert.match(html, /Download MP4/)
  assert.match(html, /Editor timeline layers are not included/)
  const button = html.match(/<button[^>]*>[\s\S]*?Start source Mini-Run<\/button>/)?.[0].split('<button').at(-1)
  assert.ok(button)
  assert.doesNotMatch(button, /\sdisabled(?:=|\s|>)/)
})

test('export panel shows distinct sync states and a retry for errors without blocking source output', () => {
  const dialog = ({children}) => React.createElement('div', null, children)
  for (const [status, expected] of [
    ['loading', /Checking editor timeline sync/],
    ['saving', /Saving editor settings to this project/],
    ['saved', /Editor timeline settings are saved/],
    ['error', /Editor timeline sync failed: Timeline request failed/],
  ]) {
    const {ExportDrawer} = loadModule('components/editor/ExportDrawer.tsx', {
      '@/hooks/use-editorial-timeline': {useEditorialTimeline: () => ({status, error: 'Timeline request failed', timeline: {revision: 2}, retry() {}})},
      '@/hooks/use-project-export-readiness': {useProjectExportReadiness: () => ({status: 'ready', readiness: {canSubmit: true, timelineRevision: 2, blockers: []}})},
      './EditorContext': {useEditor: () => ({showExport: true, setShowExport() {}})},
      '@/hooks/use-user-connections': {useUserConnections: () => ({connections: [], loading: false})},
      '@/lib/oauth/client-capabilities': {useConfiguredProviders: () => []},
      '@/components/ui/dialog': Object.fromEntries(['Dialog', 'DialogContent', 'DialogDescription', 'DialogFooter', 'DialogHeader', 'DialogTitle'].map((name) => [name, dialog])),
    })
    const html = renderToStaticMarkup(React.createElement(ExportDrawer, {projectId: 'project-1', hasSource: true, onStartRender: async () => ({success: true})}))
    assert.match(html, expected)
    assert.equal(html.includes('Retry timeline sync'), status === 'error')
    assert.match(html, /Timeline saving does not block this source-based output/)
    const button = html.match(/<button[^>]*>[\s\S]*?Start source Mini-Run<\/button>/)?.[0].split('<button').at(-1)
    assert.ok(button)
    assert.doesNotMatch(button, /\sdisabled(?:=|\s|>)/)
  }
})
