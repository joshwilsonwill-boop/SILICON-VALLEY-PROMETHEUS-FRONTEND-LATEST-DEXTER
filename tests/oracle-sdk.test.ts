import test from 'node:test'
import assert from 'node:assert/strict'
import {
  OracleClient,
  getOracleApiBaseUrl,
  resolveOracleUrl,
} from '../lib/oracle'

test('Oracle SDK - Configuration & Base URL', async (t) => {
  await t.test('resolves from VITE_API_BASE_URL first', () => {
    const origVite = process.env.VITE_API_BASE_URL
    const origNext = process.env.NEXT_PUBLIC_API_BASE_URL
    try {
      process.env.VITE_API_BASE_URL = 'https://oracle-gateway.internal:9000/'
      process.env.NEXT_PUBLIC_API_BASE_URL = 'https://fallback-gateway.internal:8000'

      assert.equal(getOracleApiBaseUrl(), 'https://oracle-gateway.internal:9000')
    } finally {
      process.env.VITE_API_BASE_URL = origVite
      process.env.NEXT_PUBLIC_API_BASE_URL = origNext
    }
  })

  await t.test('falls back to NEXT_PUBLIC_API_BASE_URL when VITE_API_BASE_URL is unset', () => {
    const origVite = process.env.VITE_API_BASE_URL
    const origNext = process.env.NEXT_PUBLIC_API_BASE_URL
    try {
      delete process.env.VITE_API_BASE_URL
      process.env.NEXT_PUBLIC_API_BASE_URL = 'https://fallback-gateway.internal:8000/'

      assert.equal(getOracleApiBaseUrl(), 'https://fallback-gateway.internal:8000')
    } finally {
      process.env.VITE_API_BASE_URL = origVite
      process.env.NEXT_PUBLIC_API_BASE_URL = origNext
    }
  })

  await t.test('resolveOracleUrl strips trailing and leading slashes accurately', () => {
    assert.equal(
      resolveOracleUrl('/api/upload-url', 'https://api.oracle.dev/'),
      'https://api.oracle.dev/api/upload-url',
    )
    assert.equal(
      resolveOracleUrl('api/process', 'https://api.oracle.dev'),
      'https://api.oracle.dev/api/process',
    )
    assert.equal(
      resolveOracleUrl('https://custom-s3.amazonaws.com/upload-signed'),
      'https://custom-s3.amazonaws.com/upload-signed',
    )
  })
})

test('Oracle SDK - Intake Law Enforcement (Rule 13)', async (t) => {
  const client = new OracleClient({ baseUrl: 'http://localhost:8000' })

  await t.test('rejects client requests containing transcripts or timestamps', async () => {
    await assert.rejects(
      async () => {
        await client.startProcess({
          bucket: 'raw-videos',
          key: 'user/test.mp4',
          filename: 'test.mp4',
          contentType: 'video/mp4',
          metadata: {
            creativePrompt: 'High pacing cinematic cut',
            // @ts-expect-error Intake law violation test
            transcript: [{ text: 'Hello world', start: 0, end: 1.5 }],
          },
        })
      },
      (err: Error) => {
        assert.match(err.message, /Intake law violation/i)
        assert.match(err.message, /transcript/i)
        return true
      },
    )
  })

  await t.test('rejects client requests containing word_timestamps or chunks', async () => {
    await assert.rejects(
      async () => {
        await client.startProcess({
          bucket: 'raw-videos',
          key: 'user/test.mp4',
          filename: 'test.mp4',
          contentType: 'video/mp4',
          metadata: {
            // @ts-expect-error Intake law violation test
            chunks: ['chunk1', 'chunk2'],
          },
        })
      },
      (err: Error) => {
        assert.match(err.message, /Intake law violation/i)
        return true
      },
    )
  })

  await t.test('rejects untrusted client userId fields', async () => {
    await assert.rejects(
      async () => {
        await client.startProcess({
          bucket: 'raw-videos',
          key: 'user/test.mp4',
          filename: 'test.mp4',
          contentType: 'video/mp4',
          metadata: {
            creativePrompt: 'Cyberpunk style',
            // @ts-expect-error Untrusted userId field test
            userId: 'attacker-spoofed-user-id',
          },
        })
      },
      (err: Error) => {
        assert.match(err.message, /userId must never be sent as a trusted client field/i)
        return true
      },
    )
  })
})

test('Oracle SDK - Contract Flow Execution', async (t) => {
  const origFetch = globalThis.fetch
  const mockCalls: { url: string; method: string; headers: Headers; body?: string }[] = []

  // Mock server responses matching Gojo's Oracle gateway contract
  globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = typeof input === 'string' ? input : input.toString()
    const method = init?.method || 'GET'
    const headers = new Headers(init?.headers)
    const body = init?.body ? String(init.body) : undefined

    mockCalls.push({ url, method, headers, body })

    if (url.endsWith('/api/upload-url') && method === 'POST') {
      const parsedBody = JSON.parse(body || '{}')
      return new Response(
        JSON.stringify({
          uploadUrl: `https://storage.oracle.internal/upload/${parsedBody.filename}`,
          key: `uploads/${parsedBody.filename}`,
          bucket: 'oracle-raw-vault',
          publicUrl: `https://cdn.oracle.internal/raw/${parsedBody.filename}`,
          expiresInSeconds: 3600,
          requiredHeaders: {
            'Content-Type': parsedBody.contentType,
            'x-amz-server-side-encryption': 'AES256',
          },
          method: 'PUT',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      )
    }

    if (url.endsWith('/api/process') && method === 'POST') {
      const parsedBody = JSON.parse(body || '{}')
      return new Response(
        JSON.stringify({
          jobId: 'job_489201',
          sessionId: 'sess_993821',
          status: 'queued',
          urls: {
            status: 'https://api.oracle.internal/api/session/sess_993821/status',
            preview: 'https://cdn.oracle.internal/preview/sess_993821.mp4',
            render: 'https://api.oracle.internal/api/session/sess_993821/render',
            events: 'https://api.oracle.internal/api/session/sess_993821/events',
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      )
    }

    if (url.includes('/api/session/sess_993821/status') && method === 'GET') {
      return new Response(
        JSON.stringify({
          sessionId: 'sess_993821',
          jobId: 'job_489201',
          status: 'ranking',
          stage: 'ranking',
          progress: 85,
          previewUrl: 'https://cdn.oracle.internal/preview/sess_993821.mp4',
          renderUrl: 'https://api.oracle.internal/api/session/sess_993821/render',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      )
    }

    if (url.includes('/api/session/sess_993821/render') && method === 'POST') {
      return new Response(
        JSON.stringify({
          renderJobId: 'render_102938',
          status: 'rendering',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      )
    }

    if (url.includes('/api/render/render_102938/status') && method === 'GET') {
      return new Response(
        JSON.stringify({
          renderJobId: 'render_102938',
          status: 'completed',
          progress: 100,
          downloadUrl: 'https://cdn.oracle.internal/download/final-render-102938.mp4?sig=xyz789',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      )
    }

    if (url.endsWith('/api/my-videos') && method === 'GET') {
      return new Response(
        JSON.stringify([
          {
            id: 'vid_1',
            sessionId: 'sess_993821',
            title: 'Cinematic Teaser',
            filename: 'trailer.mp4',
            status: 'completed',
            previewUrl: 'https://cdn.oracle.internal/preview/sess_993821.mp4',
            downloadUrl: 'https://cdn.oracle.internal/download/final-render-102938.mp4',
            createdAt: '2026-11-22T14:00:00Z',
          },
        ]),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      )
    }

    if (url.startsWith('https://storage.oracle.internal/upload/') && method === 'PUT') {
      return new Response('', { status: 200 })
    }

    return new Response('Not found', { status: 404 })
  }

  t.after(() => {
    globalThis.fetch = origFetch
  })

  const client = new OracleClient({
    baseUrl: 'https://api.oracle.internal',
    token: 'jwt-supabase-token-xyz',
  })

  await t.test('1. getUploadUrl requests signed URL with Bearer token', async () => {
    const uploadRes = await client.getUploadUrl({
      filename: 'raw-footage.mp4',
      contentType: 'video/mp4',
    })

    assert.equal(uploadRes.bucket, 'oracle-raw-vault')
    assert.equal(uploadRes.key, 'uploads/raw-footage.mp4')
    assert.equal(uploadRes.method, 'PUT')
    assert.ok(uploadRes.uploadUrl.startsWith('https://storage.oracle.internal/upload/'))

    const call = mockCalls.find((c) => c.url.endsWith('/api/upload-url'))
    assert.ok(call, 'Called /api/upload-url')
    assert.equal(call.headers.get('Authorization'), 'Bearer jwt-supabase-token-xyz')
    assert.equal(call.headers.get('Content-Type'), 'application/json')
    const parsedBody = JSON.parse(call.body || '{}')
    assert.equal(parsedBody.filename, 'raw-footage.mp4')
    assert.equal(parsedBody.contentType, 'video/mp4')
    assert.equal(parsedBody.userId, undefined, 'userId is never sent')
  })

  await t.test('2. uploadFileToSignedUrl uploads with exact signed Content-Type and no size cap', async () => {
    const fakeBlob = new Blob(['sample-video-bytes'.repeat(1000)], { type: 'video/mp4' })
    let progressCalls = 0

    await client.uploadFileToSignedUrl(
      fakeBlob,
      {
        uploadUrl: 'https://storage.oracle.internal/upload/raw-footage.mp4',
        key: 'uploads/raw-footage.mp4',
        bucket: 'oracle-raw-vault',
        method: 'PUT',
        requiredHeaders: {
          'Content-Type': 'video/mp4',
          'x-amz-server-side-encryption': 'AES256',
        },
      },
      (pct, loaded, total) => {
        progressCalls++
        assert.ok(pct >= 0 && pct <= 100)
      },
    )

    assert.ok(progressCalls > 0, 'Progress callback invoked')
    const putCall = mockCalls.find(
      (c) => c.url === 'https://storage.oracle.internal/upload/raw-footage.mp4' && c.method === 'PUT',
    )
    assert.ok(putCall, 'PUT request sent to signed storage URL')
    assert.equal(putCall.headers.get('Content-Type'), 'video/mp4')
    assert.equal(putCall.headers.get('x-amz-server-side-encryption'), 'AES256')
  })

  await t.test('3. startProcess passes raw video info and creative prompt only', async () => {
    const processRes = await client.startProcess({
      bucket: 'oracle-raw-vault',
      key: 'uploads/raw-footage.mp4',
      filename: 'raw-footage.mp4',
      contentType: 'video/mp4',
      metadata: {
        creativePrompt: 'High-energy hook with subtle zoom and kinetic typography',
        designOptions: {
          aspectRatio: '9:16',
          pacing: 'fast',
        },
      },
    })

    assert.equal(processRes.jobId, 'job_489201')
    assert.equal(processRes.sessionId, 'sess_993821')
    assert.equal(processRes.status, 'queued')
    assert.ok(processRes.urls.status)
    assert.ok(processRes.urls.preview)
    assert.ok(processRes.urls.render)
    assert.ok(processRes.urls.events)

    const processCall = mockCalls.find((c) => c.url.endsWith('/api/process'))
    assert.ok(processCall)
    assert.equal(processCall.headers.get('Authorization'), 'Bearer jwt-supabase-token-xyz')
    const parsed = JSON.parse(processCall.body || '{}')
    assert.equal(parsed.bucket, 'oracle-raw-vault')
    assert.equal(parsed.key, 'uploads/raw-footage.mp4')
    assert.equal(parsed.metadata.creativePrompt, 'High-energy hook with subtle zoom and kinetic typography')
    assert.equal(parsed.userId, undefined, 'userId not passed in body')
  })

  await t.test('4. getSessionStatus reads status and stage progression', async () => {
    const statusRes = await client.getSessionStatus('sess_993821')
    assert.equal(statusRes.sessionId, 'sess_993821')
    assert.equal(statusRes.stage, 'ranking')
    assert.equal(statusRes.progress, 85)
    assert.ok(statusRes.previewUrl)
  })

  await t.test('5. subscribeToEvents falls back gracefully to polling in Node/headless environment', async () => {
    let receivedEvents = 0
    let lastStage: string | undefined

    const unsub = client.subscribeToEvents(
      'sess_993821',
      {
        onEvent: (evt) => {
          receivedEvents++
          lastStage = evt.stage
        },
      },
      { pollIntervalMs: 50 },
    )

    // Give polling interval a moment to tick
    await new Promise((res) => setTimeout(res, 80))
    unsub()

    assert.ok(receivedEvents >= 1, 'Received polled event in fallback mode')
    assert.equal(lastStage, 'ranking')
  })

  await t.test('6. triggerRender and getRenderStatus work with returned URLs', async () => {
    const renderRes = await client.triggerRender('https://api.oracle.internal/api/session/sess_993821/render', {
      resolution: '1080p',
      quality: 'high',
      format: 'mp4',
    })

    assert.equal(renderRes.renderJobId, 'render_102938')
    assert.equal(renderRes.status, 'rendering')

    const statusRes = await client.getRenderStatus('render_102938')
    assert.equal(statusRes.status, 'completed')
    assert.equal(statusRes.progress, 100)
    assert.ok(statusRes.downloadUrl?.includes('final-render-102938.mp4'))
  })

  await t.test('7. listMyVideos returns user-scoped list', async () => {
    const myVideos = await client.listMyVideos()
    assert.equal(myVideos.length, 1)
    assert.equal(myVideos[0].title, 'Cinematic Teaser')
    assert.equal(myVideos[0].sessionId, 'sess_993821')
  })
})
