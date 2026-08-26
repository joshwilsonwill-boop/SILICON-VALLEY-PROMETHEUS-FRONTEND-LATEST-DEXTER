# Morty Voice Agent UI Design

## Objective

Give the existing Gemini voice agent a premium, immediately accessible conversation surface across the Prometheus workspace. The product name shown and spoken to users is **Morty**. Existing `Hermes` module names and the `/api/hermes/agent` route remain internal compatibility details.

The first release is a responsive, turn-by-turn voice conversation. It records an utterance, sends the completed transcript to the existing agent route, renders Morty's answer, and can speak that answer through the browser. It must not label the batch agent response as token or audio streaming.

## Product Position

This is a painkiller rather than a cosmetic addition: the agent logic exists but users cannot reach it. The interface makes the already-built memory, knowledge, Drive, and Mini-Run capabilities usable without displacing the editing workflow.

## Experience Direction

The visual standard is Awwwards-grade interaction craft with Lusion-like spatial confidence: a nearly full-bleed kinetic field, sparse typography, precise transitions, and strong depth cues. The result must still feel native to Prometheus rather than like a detached showcase.

The visual system uses the existing black workspace, white typography, and Prometheus cyan as a signal color. It avoids decorative cards, stacked glass panels, purple gradients, gratuitous glows, and explanatory product copy. A custom 2D canvas visualization provides the central visual asset and responds to Morty's state without adding a 3D dependency.

Motion follows four rules:

1. The launcher compresses before the stage expands from its location.
2. The stage enters with spring scale, depth blur, and a short background fade.
3. The kinetic canvas changes behavior by conversation state rather than playing one generic loop.
4. Reduced-motion mode removes spatial travel and continuous nonessential animation.

## Placement

`WorkspaceFrame` owns a single Morty launcher and stage so access is consistent on Studio, Direction/editor, desktop chat, and mobile chat routes. The launcher sits above safe-area insets and existing bottom controls. It is an icon control with an accessible name and tooltip, not a text pill.

Desktop opens a large bottom-right stage that occupies enough space to feel immersive while leaving the current workspace visible. Mobile opens a full-viewport stage because a floating panel would compete with the keyboard and chat drawer.

The launcher remains available whenever the stage is closed. The open stage has an explicit close button and Escape support. Its backdrop does not intercept the workspace outside the intentional dialog region on desktop.

## Stage Composition

The stage is one continuous visual plane, not a collection of cards.

- Top rail: Morty identity, compact status, minimize/close controls.
- Visual field: responsive canvas visualization with state-driven movement.
- Conversation layer: the latest user transcript and Morty response, with a restrained scrollback affordance after multiple turns.
- Action rail: microphone toggle, stop control while recording, text fallback, and send action.
- Tool activity: concise inline events for memory, knowledge, Drive gating, or Mini-Run dispatch. Tool payloads are disclosed only when useful.

The initial state focuses on the microphone. The text composer remains available for accessibility, noisy environments, and denied microphone permission.

## Conversation States

Morty uses a small explicit state machine:

- `idle`: ready for voice or text.
- `requesting_permission`: browser permission request is active.
- `listening`: microphone is recording and the canvas responds to input level.
- `transcribing`: recorded audio is being converted to text.
- `thinking`: the transcript has been submitted to Morty.
- `speaking`: browser speech synthesis is reading the reply.
- `error`: a recoverable message and retry path are shown.

Only one recording or request may run at a time. Closing the stage stops media tracks and speech synthesis. Submitting a new turn cancels stale speech before recording begins.

## Architecture

### `MortyVoiceExperience`

Owns open/closed state, conversation history, request lifecycle, keyboard handling, and rendering. It is mounted once in `WorkspaceFrame` so the experience is not duplicated by individual pages.

### `useMortyConversation`

Owns the state machine and API contract. It reuses the existing `useVoiceInput` capture/transcription path, sends prior user/assistant messages with the current transcript to `/api/hermes/agent`, validates the response shape, and appends the completed turn. It provides text submission and optional browser speech playback.

### `MortySignalCanvas`

Owns a Canvas 2D renderer that reacts to state and, while recording, microphone energy when available. It pauses offscreen, limits device-pixel ratio, cleans up animation frames, and respects reduced motion.

### Internal compatibility

The server identity changes from Hermes to Morty so the response and generated system prompt use the requested name. File paths, exported Hermes type names, tool names, memory table, and API route stay unchanged. This limits churn and preserves existing smoke scripts and integrations.

## Data Flow

1. The user opens Morty from any workspace route.
2. Voice input records through `MediaRecorder`; text input bypasses recording.
3. The existing AssemblyAI proxy returns the completed transcript.
4. The hook posts the transcript, stable session id, and prior turns to `/api/hermes/agent`.
5. The route returns Morty's reply, intent, sources, memory summary, and tool outcomes.
6. The UI renders the answer and useful tool status, then optionally speaks the reply.
7. The next turn includes local conversation history while server memory continues to persist independently.

## Error Handling

- Microphone denial keeps text input usable and provides a retry action.
- Unsupported recording formats produce a concise browser capability error.
- Empty recordings return to idle without calling the agent.
- Transcription and agent failures preserve the last transcript for retry.
- Drive-gated tool results show a connection-required state without presenting the entire turn as failed.
- Speech synthesis failure never hides the text response.
- Network requests use an abort controller and ignore stale completions after close or retry.

## Accessibility

- Dialog semantics, labelled controls, visible keyboard focus, Escape close, and focus restoration.
- `aria-live` announces state and completed replies without announcing every canvas frame.
- All icon-only controls have accessible names and tooltips.
- Text input provides a complete non-voice path.
- Canvas is decorative and has a textual state equivalent.
- Color is not the only indication of listening, thinking, error, or completion.
- Layout accounts for mobile safe areas, browser zoom, and long unbroken text.

## Testing

Focused automated tests cover the conversation reducer/state transitions and response normalization before implementation. Component-level checks cover launcher and dialog accessibility where the existing test harness permits it.

Verification includes:

- typecheck, lint, and production build;
- existing Hermes engine smoke coverage where credentials allow;
- desktop and mobile Playwright interaction checks;
- screenshots and canvas pixel checks proving the visual field is nonblank;
- microphone-denied, text-only, agent-error, and close-during-request paths;
- overlap checks against Studio and editor/chat surfaces.

## Scope Boundaries

Included: Morty identity, global launcher, adaptive stage, voice/text turns, spoken replies, tool status, responsive and accessible behavior.

Excluded: true Gemini Live/WebSocket audio streaming, voice cloning, new dependencies, database changes, Drive OAuth changes, Mini-Run backend changes, and restoration of the separately reported Brand Kit blue layer.

