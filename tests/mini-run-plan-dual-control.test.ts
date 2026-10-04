import assert from 'node:assert/strict'

import { buildMiniRunRenderPayload } from '../lib/server/mini-run-render-payload'
import { isAllowedMiniRunRequest } from '../lib/server/mini-run-proxy'
import { useMiniRunDraftStore } from '../lib/editor/mini-run-draft-store'
import { planMiniRunFromProject } from '../lib/api/mini-run-console'

async function run() {
  console.log('Running Mini-Run Dual Control Architecture tests...')

  // 1. Verify buildMiniRunRenderPayload includes draftManifest when provided
  const dummyDraft = {
    job_id: 'draft-test-123',
    chunks: [
      {
        chunkIndex: 0,
        text: 'Custom edited text',
        startMs: 0,
        endMs: 1500,
        words: [{ text: 'Custom', startMs: 0, endMs: 500, cut: false }],
      },
    ],
  }

  const payloadWithDraft = buildMiniRunRenderPayload({
    sourceUrl: 'https://example.test/source.mp4',
    source: { durationMs: 60_000, width: 1920, height: 1080 },
    shot: { preferredDurationSec: 30, targetChunkWords: 3, maxChunkWords: 5 },
    jobId: 'job-with-draft',
    draftManifest: dummyDraft,
  })

  assert.deepEqual(payloadWithDraft.draftManifest, dummyDraft, 'draftManifest must be passed into render payload')

  const payloadWithoutDraft = buildMiniRunRenderPayload({
    sourceUrl: 'https://example.test/source.mp4',
    source: { durationMs: 60_000 },
    shot: { preferredDurationSec: 30, targetChunkWords: 3, maxChunkWords: 5 },
    jobId: 'job-without-draft',
  })
  assert.equal(payloadWithoutDraft.draftManifest, undefined, 'draftManifest should be undefined when omitted')

  // 2. Verify isAllowedMiniRunRequest permits POST api/pipeline/plan
  assert.equal(isAllowedMiniRunRequest('POST', ['api', 'pipeline', 'plan']), true, 'POST api/pipeline/plan must be allow-listed')
  assert.equal(isAllowedMiniRunRequest('GET', ['api', 'pipeline', 'plan']), false, 'GET api/pipeline/plan must not be allowed')

  // 3. Verify useMiniRunDraftStore state transitions and mutations
  const store = useMiniRunDraftStore.getState()
  store.reset()

  const sampleManifest = {
    job_id: 'plan-job-abc',
    source: { url: 'https://cdn.example.test/video.mp4', width: 1080, height: 1920, duration_ms: 15000 },
    selected_window: { start_ms: 0, end_ms: 15000, duration_ms: 15000 },
    chunks: [
      {
        chunkIndex: 0,
        startMs: 200,
        endMs: 2200,
        startSec: 0.2,
        endSec: 2.2,
        wordCount: 3,
        text: 'Welcome to Prometheus',
        words: [
          { text: 'Welcome', startMs: 200, endMs: 800, startSec: 0.2, endSec: 0.8 },
          { text: 'to', startMs: 820, endMs: 1100, startSec: 0.82, endSec: 1.1 },
          { text: 'Prometheus', startMs: 1120, endMs: 2200, startSec: 1.12, endSec: 2.2 },
        ],
        typography: { fontFamily: 'Cinzel', fontSize: 72, textColor: '#FFFFFF' },
      },
    ],
    look: { preset: 'high_contrast' },
    font_manifest: { hero_font: 'Cinzel' },
  }

  useMiniRunDraftStore.getState().setPlan(sampleManifest)
  const hydrated = useMiniRunDraftStore.getState()
  assert.equal(hydrated.jobId, 'plan-job-abc')
  assert.equal(hydrated.status, 'planned')
  assert.equal(hydrated.chunks.length, 1)
  assert.equal(hydrated.chunks[0].text, 'Welcome to Prometheus')
  assert.equal(hydrated.isDirty, false)

  // 3b. Test updateWordText (e.g. correcting a name)
  useMiniRunDraftStore.getState().updateWordText(0, 2, 'Vincere')
  const afterWordEdit = useMiniRunDraftStore.getState()
  assert.equal(afterWordEdit.chunks[0].words[2].text, 'Vincere')
  assert.equal(afterWordEdit.chunks[0].text, 'Welcome to Vincere')
  assert.equal(afterWordEdit.isDirty, true)

  // 3c. Test toggleWordCut (e.g. cutting filler word)
  useMiniRunDraftStore.getState().toggleWordCut(0, 1)
  const afterCut = useMiniRunDraftStore.getState()
  assert.equal(afterCut.chunks[0].words[1].cut, true)
  assert.equal(afterCut.chunks[0].text, 'Welcome Vincere', 'Cut words must be excluded from chunk text')

  // 3d. Test phrase replace and cut helpers (used by Jarvis Voice companion)
  const replaced = useMiniRunDraftStore.getState().replacePhrase('Vincere', 'World')
  assert.equal(replaced, true)
  assert.ok(useMiniRunDraftStore.getState().chunks[0].text.includes('World'))

  // 3e. Test getDraftManifest serialization
  const exported = useMiniRunDraftStore.getState().getDraftManifest()
  assert.equal(exported.job_id, 'plan-job-abc')
  assert.equal((exported.stats as any).is_user_edited, true)
  assert.equal(Array.isArray(exported.chunks), true)

  // 4. Verify planMiniRunFromProject client function
  let fetchBody: any = null
  let fetchUrl = ''
  const mockFetch = async (url: any, init: any) => {
    fetchUrl = String(url)
    fetchBody = JSON.parse(init.body)
    return new Response(
      JSON.stringify({
        ok: true,
        jobId: 'plan-result-456',
        manifest: sampleManifest,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    )
  }

  const planResult = await planMiniRunFromProject(
    {
      projectId: 'proj-1',
      sourceAssetId: 'asset-1',
      shot: { preferredDurationSec: 30, targetChunkWords: 3, maxChunkWords: 5 },
    },
    mockFetch as any,
  )

  assert.equal(fetchUrl, '/api/mini-run/plan')
  assert.equal(fetchBody.projectId, 'proj-1')
  assert.equal(planResult.ok, true)
  assert.equal(planResult.jobId, 'plan-result-456')
  assert.deepEqual(planResult.manifest, sampleManifest)

  console.log('All Mini-Run Dual Control Architecture tests passed successfully!')
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})
