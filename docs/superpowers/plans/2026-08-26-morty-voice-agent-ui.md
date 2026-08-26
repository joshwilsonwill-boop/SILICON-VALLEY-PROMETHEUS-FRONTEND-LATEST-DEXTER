# Morty Voice Agent UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a globally accessible, Awwwards-grade Morty voice conversation stage to the Prometheus workspace while preserving the existing Hermes API and editor/chat behavior.

**Architecture:** A pure reducer/normalizer defines the conversation contract. A client hook adapts the existing `useVoiceInput` recorder and `/api/hermes/agent` endpoint into that contract. A focused client component renders the responsive stage and a Canvas 2D signal field. `WorkspaceFrame` mounts one launcher/stage for all workspace routes.

**Tech Stack:** Next.js App Router, React 19, TypeScript, Framer Motion, lucide-react, Canvas 2D, existing AssemblyAI transcription proxy, existing Hermes route.

## Global Constraints

- The product name shown and spoken to users is **Morty**.
- Existing `Hermes` module names, exported type names, tool names, memory table, and `/api/hermes/agent` route remain stable.
- The first release is turn-by-turn voice, not true Gemini Live/WebSocket audio streaming.
- Do not add npm dependencies.
- Use existing Prometheus black/white/cyan tokens and do not change existing brand colors.
- Do not modify the large Studio upload implementation or the separate Brand Kit blue-layer regression.
- Preserve microphone-denied and text-only paths.
- Respect reduced motion, safe areas, keyboard focus, and dialog semantics.

---

### Task 1: Conversation Contract

**Files:**
- Create: `lib/morty/conversation.ts`
- Test: `lib/morty/__tests__/conversation.test.ts`

**Interfaces:**
- Produces `MortyConversationState`, `MortyConversationAction`, `mortyConversationReducer`, and `normalizeMortyResult` for the hook and component.

- [ ] **Step 1: Write the failing tests**

```ts
import test from 'node:test'
import assert from 'node:assert/strict'
import { initialMortyConversation, mortyConversationReducer, normalizeMortyResult } from '../conversation'

test('submitting a transcript enters thinking with a pending request', () => {
  const next = mortyConversationReducer(initialMortyConversation, {
    type: 'submit',
    transcript: 'Find my latest source video',
  })
  assert.equal(next.status, 'thinking')
  assert.equal(next.pendingTranscript, 'Find my latest source video')
})

test('a result appends both turns and returns to idle', () => {
  const next = mortyConversationReducer(
    { ...initialMortyConversation, status: 'thinking', pendingTranscript: 'Hello' },
    { type: 'result', result: { reply: 'Hello. I am Morty.', intent: 'chat', toolCalls: [], sources: [] } },
  )
  assert.equal(next.status, 'idle')
  assert.deepEqual(next.messages, [
    { role: 'user', content: 'Hello' },
    { role: 'assistant', content: 'Hello. I am Morty.', intent: 'chat', toolCalls: [], sources: [] },
  ])
})

test('malformed API payload becomes a recoverable error', () => {
  assert.throws(() => normalizeMortyResult({ reply: 42 }), /invalid Morty response/i)
})
```

- [ ] **Step 2: Run the tests and verify they fail**

Run: `npx tsx --test lib/morty/__tests__/conversation.test.ts`

Expected: FAIL because `lib/morty/conversation.ts` does not exist.

- [ ] **Step 3: Implement the minimal reducer and normalizer**

```ts
export type MortyStatus = 'idle' | 'requesting_permission' | 'listening' | 'transcribing' | 'thinking' | 'speaking' | 'error'
export type MortyMessage = { role: 'user' | 'assistant'; content: string; intent?: string; toolCalls?: unknown[]; sources?: unknown[] }
export type MortyConversationState = { status: MortyStatus; messages: MortyMessage[]; pendingTranscript: string | null; error: string | null }
export const initialMortyConversation: MortyConversationState = { status: 'idle', messages: [], pendingTranscript: null, error: null }
export type MortyConversationAction =
  | { type: 'submit'; transcript: string }
  | { type: 'result'; result: { reply: string; intent: string; toolCalls: unknown[]; sources: unknown[] } }
  | { type: 'status'; status: MortyStatus }
  | { type: 'error'; message: string }
  | { type: 'clear_error' }

export function mortyConversationReducer(state: MortyConversationState, action: MortyConversationAction): MortyConversationState {
  switch (action.type) {
    case 'submit': return { ...state, status: 'thinking', pendingTranscript: action.transcript.trim(), error: null }
    case 'result': return { ...state, status: 'idle', pendingTranscript: null, error: null, messages: [
      ...state.messages,
      { role: 'user', content: state.pendingTranscript ?? '' },
      { role: 'assistant', content: action.result.reply, intent: action.result.intent, toolCalls: action.result.toolCalls, sources: action.result.sources },
    ] }
    case 'status': return { ...state, status: action.status }
    case 'error': return { ...state, status: 'error', error: action.message }
    case 'clear_error': return { ...state, status: 'idle', error: null }
  }
}

export function normalizeMortyResult(payload: unknown): { reply: string; intent: string; toolCalls: unknown[]; sources: unknown[] } {
  if (!payload || typeof payload !== 'object') throw new Error('Invalid Morty response.')
  const value = payload as Record<string, unknown>
  if (typeof value.reply !== 'string' || !value.reply.trim()) throw new Error('Invalid Morty response.')
  return { reply: value.reply.trim(), intent: typeof value.intent === 'string' ? value.intent : 'chat', toolCalls: Array.isArray(value.toolCalls) ? value.toolCalls : [], sources: Array.isArray(value.sources) ? value.sources : [] }
}

export function buildMortyRequest(transcript: string, messages: MortyMessage[], sessionId: string) {
  return { transcript: transcript.trim(), messages, sessionId }
}
```

The implementation must trim transcripts, reject empty replies, default missing arrays to `[]`, and preserve prior messages on errors.

- [ ] **Step 4: Run the tests and verify they pass**

Run: `npx tsx --test lib/morty/__tests__/conversation.test.ts`

Expected: all four tests pass.

- [ ] **Step 5: Commit**

```bash
git add lib/morty/conversation.ts lib/morty/__tests__/conversation.test.ts
git commit -m "feat: add Morty conversation contract"
```

### Task 2: Voice Conversation Hook

**Files:**
- Create: `hooks/use-morty-conversation.ts`
- Modify: `lib/morty/__tests__/conversation.test.ts` with the pure request serialization test; keep browser APIs out of node tests.

**Interfaces:**
- Consumes `useVoiceInput({ onTranscript })` and `MortyConversationState`.
- Produces `{ state, submitText, startListening, stopListening, close, retry, speaking, cancelSpeech }`.

- [ ] **Step 1: Write the failing pure request test**

Add this test to `lib/morty/__tests__/conversation.test.ts`:

```ts
import { buildMortyRequest } from '../conversation'

test('builds a stable agent request with prior turns', () => {
  assert.deepEqual(buildMortyRequest('Make a short', [{ role: 'user', content: 'Use my brand' }], 'session-1'), {
    transcript: 'Make a short',
    messages: [{ role: 'user', content: 'Use my brand' }],
    sessionId: 'session-1',
  })
})
```

- [ ] **Step 2: Run the focused test and verify it fails**

Run: `npx tsx --test lib/morty/__tests__/conversation.test.ts`

Expected: FAIL because `buildMortyRequest` is not exported.

- [ ] **Step 3: Implement the hook and request helper**

Use `useReducer`, an `AbortController` ref, and the existing voice hook. On transcript, dispatch `submit`, POST to `/api/hermes/agent`, normalize the response, dispatch `result`, and call `speechSynthesis.speak` when available. Abort and cancel speech in `close` and before a new submit. Use a generic error string and preserve the pending transcript for retry.

- [ ] **Step 4: Run focused tests and typecheck**

Run: `npx tsx --test lib/morty/__tests__/conversation.test.ts && npm run typecheck`

Expected: tests pass and TypeScript exits 0.

- [ ] **Step 5: Commit**

```bash
git add hooks/use-morty-conversation.ts lib/morty/conversation.ts lib/morty/__tests__/conversation.test.ts
git commit -m "feat: wire Morty voice conversation"
```

### Task 3: Signal Canvas And Voice Stage

**Files:**
- Create: `components/morty/morty-signal-canvas.tsx`
- Create: `components/morty/morty-voice-experience.tsx`

**Interfaces:**
- `MortySignalCanvas({ status, active }: { status: MortyStatus; active: boolean })` renders a decorative Canvas 2D field.
- `MortyVoiceExperience` renders the launcher and stage and consumes `useMortyConversation`.

- [ ] **Step 1: Implement the canvas**

Use `useEffect` with a resize observer, capped device-pixel ratio, a single animation frame loop, and cleanup. Draw a cyan/white orbital signal over the black plane. Vary amplitude, particle count, and rotation by `idle`, `listening`, `thinking`, `speaking`, and `error`. Pause when `document.visibilityState` is hidden and render a static frame for reduced motion.

- [ ] **Step 2: Implement the stage**

Use `AnimatePresence` and `motion` with spring entry/exit. On desktop use a fixed bottom-right stage with `max-width` and `max-height`; on mobile use a fixed full-screen stage via responsive CSS. Include a labelled dialog, top rail, status text, canvas, latest conversation scroll region with `aria-live`, tool summaries, microphone/stop/send/close buttons, and a text fallback. Keep the launcher icon-only with a tooltip and safe-area bottom offset. Use `aria-pressed` for listening and focus the close control on open.

- [ ] **Step 3: Inspect manually**

Run `npm run typecheck`, then start the dev server and inspect `/studio` and an editor route at desktop and mobile widths.

- [ ] **Step 4: Commit**

```bash
git add components/morty
git commit -m "feat: add Morty voice stage"
```

### Task 4: Global Workspace Mount And Identity

**Files:**
- Modify: `components/workspace-frame.tsx` by adding the Morty experience as a sibling to the workspace content.
- Modify: `lib/hermes/identity.ts` changing only the user-facing `name` and persona comment/prompt copy from Hermes to Morty while retaining `id: 'hermes'`.
- Create: `lib/hermes/__tests__/identity.test.ts`

**Interfaces:**
- `WorkspaceFrame` mounts exactly one `MortyVoiceExperience` when `shouldRenderWorkspaceShell` is true.
- Existing Hermes API consumers continue receiving the same schema and route.

- [ ] **Step 1: Write a failing identity assertion**

Create `lib/hermes/__tests__/identity.test.ts` with:

```ts
import test from 'node:test'
import assert from 'node:assert/strict'
import { HERMES_IDENTITY, hermesSystemPrompt } from '../identity'

test('exposes Morty while retaining the Hermes compatibility id', () => {
  assert.equal(HERMES_IDENTITY.name, 'Morty')
  assert.equal(HERMES_IDENTITY.id, 'hermes')
  assert.match(hermesSystemPrompt(), /You are Morty/i)
})
```

- [ ] **Step 2: Run it and verify it fails**

Run: `npx tsx --test lib/hermes/__tests__/identity.test.ts`

Expected: FAIL because the identity is still Hermes.

- [ ] **Step 3: Implement the identity and shell mount**

Change the identity display name and prompt-generated name only. Import and render `<MortyVoiceExperience />` after the workspace content inside the shell, keeping it outside scroll containers and above existing controls.

- [ ] **Step 4: Run all focused tests**

Run: `npx tsx --test lib/morty/__tests__/conversation.test.ts lib/hermes/__tests__/identity.test.ts`

Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add components/workspace-frame.tsx lib/hermes/identity.ts
git commit -m "feat: make Morty available across workspace"
```

### Task 5: Full Verification

**Files:**
- Modify only files required by failing verification; do not touch unrelated dirty files.

- [ ] **Step 1: Run typecheck**

Run: `npm run typecheck`

- [ ] **Step 2: Run lint**

Run: `npm run lint`

- [ ] **Step 3: Run production build**

Run: `npm run build`

- [ ] **Step 4: Run browser verification**

Start `npm run dev -- --port 3000` (use another free port if occupied). With Playwright, verify the launcher and dialog at `/studio` and an editor route at desktop and mobile viewports. Capture screenshots, assert the canvas has nonzero pixel variance, exercise text submission with a mocked API response, verify Escape/close, and confirm no overlap with the workspace controls.

- [ ] **Step 5: Review diff and commit verification fixes**

Run: `git diff --check; git diff --stat; git status --short`

Confirm only Morty files, the design/plan docs, and intended identity/shell changes are present. Leave unrelated user changes untouched.
