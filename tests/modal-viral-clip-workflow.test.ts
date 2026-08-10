import assert from 'node:assert/strict'

import {
  buildFallbackViralClipResult,
  buildModalTextChunkRequest,
  buildTimedTranscriptWords,
  normalizeViralClipSelectedClip,
  normalizeViralClipTargetPlatform,
  planModalTypographyForViralClips,
} from '@/lib/editor/modal-viral-clip-workflow'
import {createViralClipJob} from '@/lib/api/media-jobs'

async function main() {
  const words = buildTimedTranscriptWords([
    {id: 'segment-1', startMs: 1_000, endMs: 2_000, text: 'Stop scrolling.'},
    {id: 'segment-2', startMs: 2_000, endMs: 3_200, text: 'This changes everything!'},
  ])

  assert.deepEqual(words, [
    {text: 'Stop', start_ms: 1_000, end_ms: 1_500, confidence: 1},
    {text: 'scrolling.', start_ms: 1_500, end_ms: 2_000, confidence: 1},
    {text: 'This', start_ms: 2_000, end_ms: 2_400, confidence: 1},
    {text: 'changes', start_ms: 2_400, end_ms: 2_800, confidence: 1},
    {text: 'everything!', start_ms: 2_800, end_ms: 3_200, confidence: 1},
  ])

  assert.equal(normalizeViralClipTargetPlatform('instagram'), 'reels')
  assert.equal(normalizeViralClipTargetPlatform('x'), 'generic')
  assert.equal(normalizeViralClipTargetPlatform('youtube'), 'youtube')

  const backendClip = {
    clip_id: 'clip-7',
    export_start_ms: 1_400,
    export_end_ms: 3_200,
    export_duration_ms: 1_800,
    suggested_title: 'The real hook',
    reason_selected: 'Immediate tension',
    virality_score: 9.4,
  }
  const normalizedClip = normalizeViralClipSelectedClip(backendClip, 0)
  assert.equal(normalizedClip.id, 'clip-7')
  assert.equal(normalizedClip.title, 'The real hook')
  assert.equal(normalizedClip.reason, 'Immediate tension')
  assert.equal(normalizedClip.startMs, 1_400)
  assert.equal(normalizedClip.endMs, 3_200)
  assert.equal(normalizedClip.durationMs, 1_800)
  assert.equal(normalizedClip.score, 9.4)

  const chunkRequest = buildModalTextChunkRequest({
    words,
    clip: backendClip,
    targetPlatform: 'instagram',
    prompt: 'Make the opening impossible to ignore.',
    audience: 'video creators',
  })
  assert.ok(chunkRequest)
  assert.equal(chunkRequest.videoDurationMs, 1_800)
  assert.equal(chunkRequest.editorialContext.platform, 'reels')
  assert.equal(chunkRequest.transcript.text, 'Stop scrolling. This changes everything!')
  assert.deepEqual(chunkRequest.transcript.words.map(({text, startMs, endMs}) => ({text, startMs, endMs})), [
    {text: 'Stop', startMs: 0, endMs: 100},
    {text: 'scrolling.', startMs: 100, endMs: 600},
    {text: 'This', startMs: 600, endMs: 1_000},
    {text: 'changes', startMs: 1_000, endMs: 1_400},
    {text: 'everything!', startMs: 1_400, endMs: 1_800},
  ])

  const calls: unknown[] = []
  const enriched = await planModalTypographyForViralClips({
    result: {selected_clips: [backendClip]},
    request: {
      projectId: 'project-1',
      videoId: 'video-1',
      targetPlatform: 'instagram',
      clipCountMin: 1,
      clipCountMax: 1,
      prompt: 'Make the opening impossible to ignore.',
      creatorNiche: 'video creators',
      providedTranscript: words,
    },
    previewTextChunks: async (payload) => {
      calls.push(payload)
      return {schemaVersion: 'maul-shorts-text-chunk-plan/v1', chunks: [{text: 'Stop scrolling.'}]}
    },
  })

  assert.equal(calls.length, 1)
  assert.deepEqual(enriched.modalTypography, {
    status: 'completed',
    plannedClipCount: 1,
    failedClipCount: 0,
  })
  const enrichedClip = enriched.selected_clips?.[0]
  assert.equal(typeof enrichedClip, 'object')
  assert.deepEqual(
    typeof enrichedClip === 'object' && enrichedClip !== null
      ? enrichedClip.modal_text_chunk_plan
      : null,
    {schemaVersion: 'maul-shorts-text-chunk-plan/v1', chunks: [{text: 'Stop scrolling.'}]},
  )

  const originalFetch = globalThis.fetch
  const submittedRequests: Array<{url: string; init?: RequestInit}> = []
  process.env.NEXT_PUBLIC_API_BASE_URL = 'https://pipeline.example.test'
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    submittedRequests.push({url: String(input), init})
    return Response.json({jobId: 'viral-job-1', status: 'queued'}, {status: 202})
  }) as typeof fetch
  try {
    await createViralClipJob({
      projectId: 'project-1',
      videoId: 'video-1',
      targetPlatform: 'instagram',
      clipCountMin: 1,
      clipCountMax: 2,
      providedTranscript: words,
    })
  } finally {
    globalThis.fetch = originalFetch
  }
  const submittedRequest = submittedRequests[0]
  assert.ok(submittedRequest)
  assert.equal(submittedRequest.url, 'https://pipeline.example.test/api/generate-viral-clips')
  assert.equal(JSON.parse(String(submittedRequest.init?.body)).targetPlatform, 'reels')

  const fallback = buildFallbackViralClipResult({
    projectId: 'project-1',
    videoId: 'video-1',
    targetPlatform: 'tiktok',
    clipCountMin: 1,
    clipCountMax: 2,
    providedTranscript: words,
    metadataOverrides: {
      sourceDurationMs: 3_200,
      highlights: [{id: 'highlight-1', atMs: 2_000, label: 'The payoff'}],
    },
  })
  assert.equal(fallback.fallback, true)
  assert.equal(fallback.selected_clips?.length, 1)
  assert.deepEqual(fallback.selected_clips?.[0], {
    clip_id: 'resilience-highlight-1',
    rank: 1,
    export_start_ms: 0,
    export_end_ms: 3_200,
    export_duration_ms: 3_200,
    suggested_title: 'The payoff',
    reason_selected: 'Resilience candidate from a locally detected highlight; primary clip selection was unavailable.',
    fallback: true,
  })
}

void main()
