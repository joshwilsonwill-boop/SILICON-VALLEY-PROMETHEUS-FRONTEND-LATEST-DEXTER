import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import vm from 'node:vm'
import ts from 'typescript'

const require = createRequire(import.meta.url)
const { GeminiLiveClient } = require('../lib/voice-companion/gemini-live-client.ts')
const routeSource = readFileSync(new URL('../app/api/prometheus-chat/transcribe/route.ts', import.meta.url), 'utf8')
const routeCode = ts.transpileModule(routeSource, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText

class FakeSocket {
  static OPEN = 1
  static CONNECTING = 0
  static instances = []
  readyState = FakeSocket.OPEN
  sent = []
  constructor() {
    FakeSocket.instances.push(this)
    queueMicrotask(() => this.onopen?.())
  }
  send(text) {
    const payload = JSON.parse(text)
    this.sent.push(payload)
    if (payload.setup) this.onmessage?.({ data: JSON.stringify({ setupComplete: {} }) })
  }
  close(code = 1000, reason = '') {
    this.readyState = 3
    this.onclose?.({ code, reason })
  }
}

for (const custom of [false, true]) {
  test(`live microphone and reply transcription use English hints with ${custom ? 'custom' : 'default'} instructions, including reconnects`, async (t) => {
    const originalSocket = globalThis.WebSocket
    globalThis.WebSocket = FakeSocket
    const client = new GeminiLiveClient({
      wsUrl: 'ws://test',
      ...(custom ? { systemInstruction: 'Help with editing.', projectContext: 'Title: Hola', projectId: 'language-test' } : {}),
    })
    t.after(() => {
      client.disconnect()
      globalThis.WebSocket = originalSocket
    })
    for (let attempt = 0; attempt < 2; attempt++) {
      await client.connect()
      const setup = FakeSocket.instances.at(-1).sent.find((payload) => payload.setup).setup
      assert.deepEqual(setup.inputAudioTranscription.languageCodes, ['en-US'], 'Microphone transcription must not default to automatic language detection')
      assert.deepEqual(setup.outputAudioTranscription.languageCodes, ['en-US'])
      assert.equal(setup.inputAudioTranscription.mode, 'VERBATIM')
      const instruction = setup.systemInstruction.parts.map((part) => part.text).join('\n')
      assert.match(instruction, /English/)
      assert.match(instruction, /do not translate/i)
      assert.match(instruction, /explicitly asks/i)
      if (custom) {
        assert.match(instruction, /Help with editing\./)
        assert.match(instruction, /Title: Hola/)
      }
      client.disconnect()
    }
  })
}

function loadRoute({ env, fetch, generateContent, user = { id: 'test-user' } }) {
  const exports = {}
  vm.runInNewContext(routeCode, {
    exports, Buffer, FormData, Response, AbortSignal,
    process: { env },
    console: { warn() {} },
    setTimeout: (callback) => { queueMicrotask(callback); return 0 },
    fetch,
    require: (name) => {
      if (name === 'server-only') return {}
      if (name === 'next/server') return { NextResponse: Response }
      if (name === '@google/generative-ai') return {
        GoogleGenerativeAI: class {
          getGenerativeModel() { return { generateContent } }
        },
      }
      if (name === '@/lib/r2/assembly-transcript') return { assemblyTranscriptToSegments: () => [] }
      if (name === '@/lib/supabase/server') return {
        createClient: async () => ({ auth: { getUser: async () => ({ data: { user }, error: null }) } }),
      }
      throw new Error(`Unexpected dependency: ${name}`)
    },
  })
  return exports
}

function audioRequest() {
  const body = new FormData()
  body.append('audio', new Blob([new Uint8Array(1024)], { type: 'audio/webm' }), 'voice.webm')
  return new Request('http://localhost/api/prometheus-chat/transcribe', { method: 'POST', body })
}

test('Gemini voice-message requests specify English verbatim transcription without translation', async () => {
  let instruction
  const route = loadRoute({
    env: { GEMINI_API_KEY: 'test-key' },
    generateContent: async (parts) => {
      instruction = parts.find((part) => part.text).text
      return { response: { text: () => 'Please pause the video.' } }
    },
    fetch: () => assert.fail('Gemini should complete without a fallback'),
  })
  const response = await route.POST(audioRequest())
  assert.equal(response.status, 200)
  assert.equal((await response.json()).text, 'Please pause the video.')
  assert.match(instruction, /English/)
  assert.match(instruction, /do not translate/i)
  assert.match(instruction, /silence/i)
})

for (const provider of ['Groq', 'OpenAI', 'AssemblyAI']) {
  test(`${provider} voice-message transcription explicitly requests English`, async () => {
    const env = { [`${provider === 'Groq' ? 'GROQ' : provider === 'OpenAI' ? 'OPENAI' : 'ASSEMBLYAI'}_API_KEY`]: 'test-key' }
    const requests = []
    const route = loadRoute({
      env,
      fetch: async (url, init = {}) => {
        requests.push({ url, init })
        if (url.endsWith('/upload')) return Response.json({ upload_url: 'https://audio.test/voice.webm' })
        if (url.endsWith('/transcript')) return Response.json({ id: 'test-transcript' })
        return Response.json({ status: 'completed', text: 'Please pause the video.', segments: [] })
      },
    })
    const response = await route.POST(audioRequest())
    assert.equal(response.status, 200)
    assert.equal((await response.json()).text, 'Please pause the video.')
    if (provider === 'AssemblyAI') {
      const request = requests.find(({ url }) => url.endsWith('/transcript'))
      const body = JSON.parse(request.init.body)
      assert.equal(body.language_code, 'en')
      assert.equal(body.language_detection, false)
    } else {
      assert.equal(requests[0].init.body.get('language'), 'en', 'Short English commands must not use Whisper language autodetection')
    }
  })
}

test('English language constraints survive the entire provider fallback chain', async () => {
  const requests = []
  const route = loadRoute({
    env: { GEMINI_API_KEY: 'test', GROQ_API_KEY: 'test', ASSEMBLYAI_API_KEY: 'test', OPENAI_API_KEY: 'test' },
    generateContent: async () => { throw new Error('Gemini unavailable') },
    fetch: async (url, init = {}) => {
      requests.push({ url, init })
      if (url.includes('groq.com') || url.endsWith('/upload')) return new Response('Provider unavailable', { status: 503 })
      return Response.json({ text: 'Please pause the video.', segments: [] })
    },
  })
  const response = await route.POST(audioRequest())
  assert.equal(response.status, 200)
  assert.equal((await response.json()).text, 'Please pause the video.')
  for (const { url, init } of requests.filter(({ url }) => url.endsWith('/transcriptions'))) {
    assert.equal(init.body.get('language'), 'en', `Missing English constraint on ${url}`)
  }
  assert.equal(requests.length, 3)
})

test('unauthenticated voice-message requests still fail before calling any provider', async () => {
  const route = loadRoute({
    env: { GROQ_API_KEY: 'test' }, user: null,
    fetch: () => assert.fail('Unauthenticated requests must not reach providers'),
  })
  assert.equal((await route.POST(audioRequest())).status, 401)
})
