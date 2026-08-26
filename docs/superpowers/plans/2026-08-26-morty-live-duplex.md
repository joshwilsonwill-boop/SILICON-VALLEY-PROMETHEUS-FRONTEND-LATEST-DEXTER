# Morty Live Duplex Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Morty's completed-turn voice stage with a circular Gemini Live control that streams continuous audio, transcripts, interruption, existing tools, and memory.

**Architecture:** The browser opens a constrained Gemini Live WebSocket with a server-issued ephemeral token. Native Web Audio sends 16 kHz PCM chunks and schedules 24 kHz PCM output while a pure reducer assembles session state. Server routes issue the token and execute existing Hermes tools and memory operations.

**Tech Stack:** Next.js App Router, React 19, TypeScript, native WebSocket, Web Audio API/AudioWorklet, Gemini Live API, Supabase session auth, Framer Motion, Node `tsx --test`, Playwright.

## Global Constraints

- Gemini Live is the only realtime provider in this release; do not add OpenAI Realtime.
- Keep `GEMINI_API_KEY` server-only. `POST /api/morty/live/token` issues a constrained one-use ephemeral token.
- Every Live endpoint requires an authenticated Supabase user. Anonymous Live sessions are forbidden.
- Send mono 16 kHz PCM16 little-endian microphone chunks every 20-100 ms. Decode model audio as 24 kHz PCM16 little-endian.
- User activity clears model playback immediately. Morty never speaks over a user.
- Preserve Hermes modules and `/api/hermes/agent` for text/completed-turn fallback.
- Live UI remains an actual circle with a temporary transcript rail. No card, modal, composer, particle canvas, or permanent chat log.
- Never log, store, or render ephemeral tokens, long-lived keys, raw audio, raw tool arguments, or OAuth credentials.
- Preserve unrelated worktree files: `Allcredd.txt`, `all_cred.txt`, and `.superpowers/brainstorm/`.

---

## File Structure

| File | Responsibility |
| --- | --- |
| `lib/morty/live-protocol.ts` | Provider message parsing, state transitions, transcript assembly, reconnect limits, and safe tool call records. |
| `lib/morty/live-audio.ts` | PCM conversions and browser capture/playback lifecycle classes. |
| `lib/morty/__tests__/live-protocol.test.ts` | Protocol/reducer behavior tests. |
| `lib/morty/__tests__/live-audio.test.ts` | PCM conversion tests. |
| `lib/hermes/live-context.ts` | Morty instructions built from Hermes identity and recalled memory. |
| `app/api/morty/live/token/route.ts` | Authenticated constrained Gemini token issuer. |
| `app/api/morty/live/tool/route.ts` | Authenticated server-side Live function executor. |
| `app/api/morty/live/memory/route.ts` | Authenticated final transcript memory persistence. |
| `app/api/morty/live/__tests__/routes.test.ts` | Endpoint authorization/contract tests. |
| `hooks/use-morty-live-conversation.ts` | Token, socket, audio, tool relay, barge-in, reconnect, cleanup. |
| `components/morty/morty-live-control.tsx` | Circular launcher/live surface and tangent transcript rail. |
| `components/workspace-frame.tsx` | Single workspace-level mount. |

---

### Task 1: Add Live Protocol State

**Files:**
- Create: `lib/morty/live-protocol.ts`
- Create: `lib/morty/__tests__/live-protocol.test.ts`

**Interfaces:**
- Produces: `MortyLiveState`, `MortyLiveAction`, `initialMortyLiveState`, `mortyLiveReducer`, `parseGeminiLiveMessage`, `toGeminiToolResponse`.
- Consumed by: Tasks 3-5.

- [ ] **Step 1: Write failing transcript and interruption tests**

```ts
import assert from 'node:assert/strict'
import test from 'node:test'
import { initialMortyLiveState, mortyLiveReducer, parseGeminiLiveMessage } from '@/lib/morty/live-protocol'

test('appends partial live transcripts in arrival order', () => {
  const first = mortyLiveReducer(initialMortyLiveState, { type: 'provider_event', event: parseGeminiLiveMessage({ serverContent: { inputTranscription: { text: 'make the' } } }) })
  const second = mortyLiveReducer(first, { type: 'provider_event', event: parseGeminiLiveMessage({ serverContent: { inputTranscription: { text: ' hook sharper' } } }) })
  assert.equal(second.liveUserTranscript, 'make the hook sharper')
})

test('user activity interrupts output', () => {
  const next = mortyLiveReducer({ ...initialMortyLiveState, phase: 'speaking', scheduledOutput: true }, { type: 'user_activity_started' })
  assert.equal(next.phase, 'listening')
  assert.equal(next.scheduledOutput, false)
  assert.equal(next.interrupted, true)
})
```

- [ ] **Step 2: Verify the tests fail**

Run: `npx tsx --test lib/morty/__tests__/live-protocol.test.ts`

Expected: FAIL because `live-protocol.ts` is absent.

- [ ] **Step 3: Implement the smallest typed event reducer**

```ts
export type MortyLivePhase = 'idle' | 'connecting' | 'listening' | 'speaking' | 'reconnecting' | 'error'
export type MortyLiveState = {
  phase: MortyLivePhase
  liveUserTranscript: string
  liveAssistantTranscript: string
  previousExchange: Array<{ role: 'user' | 'assistant'; text: string }>
  scheduledOutput: boolean
  interrupted: boolean
  resumptionHandle: string | null
  reconnectAttempts: number
  error: string | null
}
export function parseGeminiLiveMessage(value: unknown): MortyLiveEvent
export function mortyLiveReducer(state: MortyLiveState, action: MortyLiveAction): MortyLiveState
export function toGeminiToolResponse(callId: string, name: string, response: unknown): Record<string, unknown>
```

Support `inputTranscription`, `outputTranscription`, `interrupted`, `turnComplete`, `toolCall`, and `sessionResumptionUpdate`. Treat malformed values as no-op events. Keep no raw provider payload; cap reconnect attempts at three.

- [ ] **Step 4: Verify the tests pass**

Run: `npx tsx --test lib/morty/__tests__/live-protocol.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/morty/live-protocol.ts lib/morty/__tests__/live-protocol.test.ts
git commit -m "feat: add Morty live protocol state"
```

### Task 2: Add PCM Audio Primitives

**Files:**
- Create: `lib/morty/live-audio.ts`
- Create: `lib/morty/__tests__/live-audio.test.ts`

**Interfaces:**
- Produces: `float32ToPcm16`, `pcm16LeToFloat32`, `encodePcmBase64`, `MortyAudioCapture`, `MortyAudioPlayback`.
- Consumed by: Task 5.

- [ ] **Step 1: Write the failing PCM test**

```ts
import assert from 'node:assert/strict'
import test from 'node:test'
import { float32ToPcm16 } from '@/lib/morty/live-audio'

test('converts and clamps Float32 samples to PCM16', () => {
  const pcm = float32ToPcm16(new Float32Array([-2, -1, 0, 0.5, 1, 2]))
  assert.deepEqual([...pcm], [-32768, -32768, 0, 16384, 32767, 32767])
})
```

- [ ] **Step 2: Verify the test fails**

Run: `npx tsx --test lib/morty/__tests__/live-audio.test.ts`

Expected: FAIL because `live-audio.ts` is absent.

- [ ] **Step 3: Implement browser-safe capture/playback**

```ts
export function float32ToPcm16(samples: Float32Array): Int16Array
export function pcm16LeToFloat32(bytes: ArrayBuffer): Float32Array
export function encodePcmBase64(samples: Int16Array): string
export class MortyAudioCapture { async start(onChunk: (pcm: string) => void, onLevel: (level: number) => void): Promise<void>; stop(): Promise<void> }
export class MortyAudioPlayback { async start(): Promise<void>; enqueue(pcm: string): void; clear(): void; close(): Promise<void> }
```

Capture requests mono input, uses an inline Blob AudioWorklet, downsamples to 16 kHz, and emits 20-100 ms base64 PCM chunks. Playback creates 24 kHz `AudioBuffer`s, schedules after the last source, and cancels every queued `AudioBufferSourceNode` on `clear`. Do not initialize browser resources during SSR.

- [ ] **Step 4: Verify the test passes**

Run: `npx tsx --test lib/morty/__tests__/live-audio.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/morty/live-audio.ts lib/morty/__tests__/live-audio.test.ts
git commit -m "feat: add Morty live audio primitives"
```

### Task 3: Issue Authenticated Live Tokens

**Files:**
- Create: `lib/hermes/live-context.ts`
- Create: `app/api/morty/live/token/route.ts`
- Create: `app/api/morty/live/__tests__/routes.test.ts`

**Interfaces:**
- Produces: `createMortyLiveSessionContext()` and `{ token, expiresAt, sessionId }`.
- Consumed by: Tasks 4-5.

- [ ] **Step 1: Write failing context/token tests**

```ts
test('rejects unauthenticated Live token requests', async () => {
  const response = await POST(new Request('http://localhost/api/morty/live/token', { method: 'POST' }) as never)
  assert.equal(response.status, 401)
})

test('builds instructions from Morty identity and recalled memory', async () => {
  const context = await createMortyLiveSessionContext({ userId: 'user-1', sessionId: 'live-1', memoryStore })
  assert.match(context.instructions, /Morty/)
  assert.match(context.instructions, /prefers concise cuts/)
})
```

- [ ] **Step 2: Verify the tests fail**

Run: `npx tsx --test app/api/morty/live/__tests__/routes.test.ts`

Expected: FAIL because the route/context are absent.

- [ ] **Step 3: Implement token/context contract**

```ts
export async function createMortyLiveSessionContext(input: {
  userId: string
  sessionId: string
  memoryStore: HermesMemoryStore
  getDriveToken?: () => Promise<string | null>
}): Promise<{ instructions: string }>
```

Require the session user. Return `401` without one and `500` only when `GEMINI_API_KEY` is absent. Call `https://generativelanguage.googleapis.com/v1beta/auth_tokens` with `x-goog-api-key`, `uses: 1`, 30-minute expiry, one-minute new-session expiry, `models/gemini-3.1-flash-live-preview` or `MORTY_LIVE_MODEL`, audio output, session resumption, Morty instructions, and allowed Hermes function declarations. Return token `name`, expiry, and opaque session ID only.

- [ ] **Step 4: Verify tests pass**

Run: `npx tsx --test app/api/morty/live/__tests__/routes.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/hermes/live-context.ts app/api/morty/live/token/route.ts app/api/morty/live/__tests__/routes.test.ts
git commit -m "feat: add Morty Live session tokens"
```

### Task 4: Relay Tools and Persist Memory

**Files:**
- Create: `app/api/morty/live/tool/route.ts`
- Create: `app/api/morty/live/memory/route.ts`
- Modify: `app/api/morty/live/__tests__/routes.test.ts`

**Interfaces:**
- Consumes: `createHermesToolExecutor`, `toHermesToolCallResult`, memory helpers, `HERMES_TOOL_DEFINITIONS`.
- Produces: `{ callId, response, summary }` and `{ persisted, added }`.
- Consumed by: Task 5.

- [ ] **Step 1: Add failing tool/memory tests**

```ts
test('rejects an undeclared Live tool name', async () => {
  const response = await POST_TOOL(requestFor({ callId: 'call-1', name: 'read_secrets', args: {} }))
  assert.equal(response.status, 400)
})

test('persists only salient final transcript snippets', async () => {
  const response = await POST_MEMORY(requestFor({ sessionId: 'live-1', userTranscript: 'Please make a concise 9:16 hook.', assistantTranscript: 'I will tighten the opening.' }))
  assert.equal((await response.json()).added, 1)
})
```

- [ ] **Step 2: Verify tests fail**

Run: `npx tsx --test app/api/morty/live/__tests__/routes.test.ts`

Expected: FAIL because the routes are absent.

- [ ] **Step 3: Implement server-only handlers**

Reject absent/mismatched session IDs, missing call IDs, tool names absent from `HERMES_TOOL_DEFINITIONS`, non-object args, transcripts over 4,000 characters, and unauthenticated users. Build `HermesToolContext` from the authenticated user, memory store, Drive refresh, and Mini-Run environment. Execute only `createHermesToolExecutor(context)(name, args)`. Return a concise `toHermesToolCallResult` summary plus Gemini-required structured result.

For memory, extract snippets from final user/assistant transcripts, create `HermesMemoryEntry` values for the authenticated user/session, compact with current entries, best-effort save, and return count only.

- [ ] **Step 4: Verify tests pass**

Run: `npx tsx --test app/api/morty/live/__tests__/routes.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/api/morty/live/tool/route.ts app/api/morty/live/memory/route.ts app/api/morty/live/__tests__/routes.test.ts
git commit -m "feat: relay Morty Live tools and memory"
```

### Task 5: Implement the Live Conversation Hook

**Files:**
- Create: `hooks/use-morty-live-conversation.ts`
- Modify: `lib/morty/__tests__/live-protocol.test.ts`

**Interfaces:**
- Consumes: Tasks 1-4.
- Produces: `useMortyLiveConversation(): { state, open, close, retry }`.
- Consumed by: Task 6.

- [ ] **Step 1: Add the failing reconnect test**

```ts
test('permits three reconnect attempts then reports an error', () => {
  let state = { ...initialMortyLiveState, phase: 'reconnecting' as const }
  for (let attempt = 0; attempt < 3; attempt += 1) state = mortyLiveReducer(state, { type: 'reconnect_failed' })
  assert.equal(state.phase, 'error')
  assert.match(state.error ?? '', /reconnect/i)
})
```

- [ ] **Step 2: Verify it fails**

Run: `npx tsx --test lib/morty/__tests__/live-protocol.test.ts`

Expected: FAIL because retry limiting is absent.

- [ ] **Step 3: Implement Live lifecycle and barge-in**

`open` fetches one token, opens constrained `BidiGenerateContent`, sends setup, starts capture, and dispatches parsed events. On user activity, `playback.clear()` runs before the socket receives `response.cancel`; then reducer action `user_activity_started` runs. Tool calls POST to the tool route and send `toGeminiToolResponse` on the same socket. `close` stops capture, clears/closes playback, closes socket, persists final text, aborts fetches, and discards the token. Recoverable close uses the latest resumption handle and a fresh token, never more than three attempts.

- [ ] **Step 4: Verify focused tests pass**

Run: `npx tsx --test lib/morty/__tests__/live-protocol.test.ts lib/morty/__tests__/live-audio.test.ts app/api/morty/live/__tests__/routes.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add hooks/use-morty-live-conversation.ts lib/morty/__tests__/live-protocol.test.ts
git commit -m "feat: connect Morty to Gemini Live"
```

### Task 6: Replace the Old Stage with a Circular Live Control

**Files:**
- Create: `components/morty/morty-live-control.tsx`
- Modify: `components/workspace-frame.tsx`
- Delete: `components/morty/morty-voice-experience.tsx`
- Delete: `components/morty/morty-signal-canvas.tsx`

**Interfaces:**
- Consumes: Task 5 hook.
- Produces: a globally mounted circular launcher plus temporary transcript rail.

- [ ] **Step 1: Write the failing UI behavior test**

```ts
test('the launcher exposes live start and disconnect actions', () => {
  const view = render(<MortyLiveControl />)
  expect(view.getByRole('button', { name: 'Start live conversation with Morty' })).toBeTruthy()
  fireEvent.click(view.getByRole('button', { name: 'Start live conversation with Morty' }))
  expect(view.getByRole('button', { name: 'End live conversation with Morty' })).toBeTruthy()
})
```

- [ ] **Step 2: Verify the UI test fails**

Run: `npx tsx --test components/morty/__tests__/morty-live-control.test.tsx`

Expected: FAIL because `MortyLiveControl` is absent. If no DOM test harness exists, record that fact and use the Playwright assertion in Task 7 as the executable UI test.

- [ ] **Step 3: Implement and mount the control**

```tsx
<button
  type="button"
  aria-label={active ? 'End live conversation with Morty' : 'Start live conversation with Morty'}
  aria-pressed={active}
  className="fixed ... aspect-square rounded-full ..."
>
  {active ? <X /> : <Plus />}
</button>
```

Use only a circle-to-circle scale transition, no modal/backdrop. The active shell stays `aspect-square rounded-full overflow-hidden`, grows from 48 px to a 300-360 px desktop circle, and respects safe areas. Render tangent current input/output plus one previous exchange. No composer/header. Use DOM waveform bars driven by capture level and a static cue under reduced motion. Replace `<MortyVoiceExperience />` with `<MortyLiveControl />`; after it compiles, delete the old stage and canvas. Retain the completed-turn hook for future explicit text fallback only.

- [ ] **Step 4: Verify UI behavior**

Run: `npx tsx --test components/morty/__tests__/morty-live-control.test.tsx`

Expected: PASS, or the Task 7 Playwright alternative is executed if the DOM harness is unavailable.

- [ ] **Step 5: Commit**

```bash
git add -A components/morty components/workspace-frame.tsx
git commit -m "feat: replace Morty stage with live circle"
```

### Task 7: Verify the Duplex Experience

**Files:**
- Create: `scripts/morty-live-smoke.ts` only if a valid Gemini key makes a reusable smoke probe valuable.

- [ ] **Step 1: Run focused tests**

```bash
npx tsx --test \
  lib/morty/__tests__/conversation.test.ts \
  lib/morty/__tests__/live-protocol.test.ts \
  lib/morty/__tests__/live-audio.test.ts \
  lib/hermes/__tests__/identity.test.ts \
  app/api/morty/live/__tests__/routes.test.ts
```

Expected: all pass.

- [ ] **Step 2: Run static verification**

```bash
npx eslint components/morty/morty-live-control.tsx hooks/use-morty-live-conversation.ts lib/morty/live-protocol.ts lib/morty/live-audio.ts lib/hermes/live-context.ts app/api/morty/live/token/route.ts app/api/morty/live/tool/route.ts app/api/morty/live/memory/route.ts components/workspace-frame.tsx
npm run typecheck
npm run build
```

Expected: each exits 0. Report unrelated baseline global-lint failures separately if they remain.

- [ ] **Step 3: Run desktop/mobile Playwright checks**

Open `/dashboard` at 1440x960 and 390x844. Mock token/WebSocket events where microphone access is unavailable. Assert start button, end button, circular equality, input transcription, output transcription, interruption, reconnect, close, denied microphone, and no horizontal overflow:

```ts
expect(page.getByRole('button', { name: 'Start live conversation with Morty' })).toBeVisible()
await page.getByRole('button', { name: 'Start live conversation with Morty' }).click()
expect(page.getByRole('button', { name: 'End live conversation with Morty' })).toBeVisible()
expect(await page.locator('[data-morty-live-circle]').evaluate((node) => {
  const rect = node.getBoundingClientRect()
  return Math.abs(rect.width - rect.height) < 1
})).toBe(true)
```

- [ ] **Step 4: Run real Live smoke when credentials permit**

Run: `npx tsx scripts/morty-live-smoke.ts`

Expected: constrained token, Live connection, audio/transcript event, clean close, and no token printed. If no Gemini key works, report that external limitation alongside mocked results.

- [ ] **Step 5: Commit a reusable smoke probe only when added**

```bash
git add scripts/morty-live-smoke.ts
git commit -m "test: add Morty Live smoke probe"
```

Do not create an empty commit.

## Plan Self-Review

- **Spec coverage:** Tasks 1-2 cover continuous protocol/audio. Tasks 3-4 secure Live connection and retain Hermes tools/memory. Task 5 adds WebSocket, barge-in, tool relay, reconnect, and cleanup. Task 6 replaces the panel with a circle. Task 7 proves behavior and layout.
- **Placeholder scan:** No deferred-work marker, vague testing statement, or unspecified implementation step is present.
- **Type consistency:** Task 1 owns state; Task 2 owns audio classes; Tasks 3-4 own endpoint contracts; Task 5 consumes those contracts; Task 6 consumes the Task 5 hook.
