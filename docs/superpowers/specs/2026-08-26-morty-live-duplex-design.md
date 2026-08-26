# Morty Live Duplex Design

## Objective

Replace the current record-transcribe-request-speak Morty implementation with a genuinely live, bidirectional voice session. Morty must hear continuous microphone audio, speak continuous native model audio, render both sides as they arrive, and yield immediately when the user begins speaking.

The interface must not look or behave like a second chatbot. It is a compact contextual control for the existing Prometheus workspace.

## Decision

Use **Gemini Live API** for the realtime voice path. Do not switch to OpenAI Realtime for this release.

The current Gemini `generateContent` integration is intentionally retained for typed, completed-turn requests at `/api/hermes/agent`. It cannot provide duplex speech. The new Live path uses Gemini's stateful WebSocket protocol, native audio input/output, voice activity detection, output/input transcription, tool calls, session resumption, and barge-in.

Gemini Live is sufficient for this requirement. An OpenAI Realtime adapter is deliberately out of scope; adding it now would duplicate the provider integration while neither improving the requested interaction nor preserving the existing Gemini agent work more effectively.

## User Experience

### Resting state

Morty is a single fixed circular control on workspace pages. It contains only a plus symbol. It has no label, panel, card, orb field, or ambient animation.

Hover and keyboard focus provide a short, restrained rotation and signal ring. A click or keyboard activation starts a Live session. The plus rotates to an X, which disconnects the session.

### Live state

The control expands from its origin into a true circular surface, using a fixed square aspect ratio and full circular clipping at every viewport. It is not a rounded rectangle.

The circle communicates current activity through a simple inner waveform and three visual states: listening, speaking, and reconnecting. It does not use the previous canvas particle scene.

A narrow transcript rail sits tangent to the circle. It contains only the current incoming/outgoing utterance and the immediately previous exchange. The rail appears after the session opens and disappears on close. There is no text composer, send button, chat log, title bar, or standalone "voice agent" stage.

On narrow viewports the circle scales within the safe area and the transcript rail reflows below it. The surface remains circular rather than becoming a full-screen card.

### Live conversation behavior

1. Opening Morty requests microphone access and starts a Live connection.
2. Browser microphone PCM is continuously sent in short chunks while the session remains open.
3. Morty audio starts playing as chunks arrive. Output transcription is appended in real time.
4. If user speech begins while Morty is speaking, browser playback is cleared immediately and the Live session receives the new audio. The prior response is cancelled/marked interrupted.
5. Input transcription is shown as guidance as it arrives. Neither party waits for a complete MediaRecorder blob or a completed model response.
6. The session reconnects with the most recent Gemini resumption token after a recoverable disconnect. If reconnect fails, Morty falls back to the compact text/turn path only after explicit user action.

## Transport Architecture

### Auth and connection

`POST /api/morty/live/token` is a server-only route. It requires the current authenticated user and `GEMINI_API_KEY`; anonymous live sessions are rejected.

The route creates a single-use, short-lived Gemini ephemeral token constrained to the selected Live model, audio output, configured voice, session resumption, and Morty's system instruction. It returns the token and expiry metadata, never the permanent Gemini key.

`useMortyLiveConversation` opens the browser-to-Gemini constrained Live WebSocket with the ephemeral token. Direct client-to-Gemini transport avoids an avoidable audio proxy hop. The hook owns reconnect, event sequencing, media resources, audio playback, and teardown.

### Audio

`MortyAudioCapture` replaces `MediaRecorder` for live mode. An `AudioWorklet` captures mono microphone samples, down-samples them to 16 kHz PCM16 little-endian, and yields 20-100 ms chunks to the Live socket.

`MortyAudioPlayback` decodes Gemini's 24 kHz PCM16 output into an `AudioContext` queue. It schedules chunks without gaps and can flush all scheduled playback synchronously for barge-in.

The browser uses the Live API's VAD/activity events to reflect listening and speaking. Browser-owned microphone level sampling only drives visual feedback; it is never used as an authority for turn boundaries.

### Conversation and memory

The Live WebSocket is the source of truth for the active conversation. It carries input/output audio and transcript events within one stateful session.

At session start, server-generated context includes Morty's identity, the selected workspace context, and recalled Hermes memory. On completed output or session close, a server endpoint persists salient transcript snippets through the existing Hermes memory store.

The completed-turn `useMortyConversation` hook remains available for text fallback and does not share a simultaneous session with the Live hook.

### Tools

Live function calls never execute in the browser. The client forwards a constrained tool-call envelope to `POST /api/morty/live/tool`; the route authenticates the user/session, invokes the existing Hermes tool executor, and returns a validated tool response to the Live socket.

Existing tool definitions, Google Drive token lookup, knowledge retrieval, Mini-Run dispatch, and memory table remain server-owned. The live transcript rail may show only concise completed tool status, never raw arguments, credentials, or token values.

## Components and Contracts

- `components/morty/morty-live-control.tsx`: the circular launcher/live surface and transcript rail; replaces `MortyVoiceExperience` in `WorkspaceFrame`.
- `hooks/use-morty-live-conversation.ts`: lifecycle hook for token acquisition, WebSocket messages, reconnect, tool relay, and live state.
- `lib/morty/live-protocol.ts`: provider event normalization, state transitions, transcript assembly, and safe tool-call parsing. Pure and unit tested.
- `lib/morty/live-audio.ts`: PCM conversion and audio queue helpers, with browser wrappers isolated from provider protocol code.
- `app/api/morty/live/token/route.ts`: authenticated ephemeral-token issuer.
- `app/api/morty/live/tool/route.ts`: authenticated server-side tool executor for a validated Live function-call envelope.
- `app/api/morty/live/memory/route.ts`: authenticated memory-summary persistence at session completion.

`HERMES_IDENTITY` remains product-named Morty. Existing `lib/hermes/*` compatibility names and `/api/hermes/agent` remain stable.

## Failure and Safety Behavior

- A denied microphone permission leaves the circle closed and shows an accessible inline error only after activation.
- Missing `GEMINI_API_KEY`, token provisioning failure, unsupported Web Audio, or WebSocket failure prevent entering a false "live" state.
- A short-lived token is never written to local storage, query parameters, analytics, console logs, or React state persisted beyond the active session.
- The permanent Gemini key remains server-only.
- User speech flushes queued output playback and cancels the active response; it must not continue to talk over the user.
- Reconnect uses a bounded retry policy and the most recent session-resumption handle. Terminal failure offers an explicit text fallback action.
- Closing the X stops tracks, closes audio contexts and WebSocket, clears timers/playback, persists final eligible memory, and restores focus to the circular launcher.

## Accessibility

- The launcher/X is a labelled button with a visible focus ring and keyboard operation.
- Live state, interruptions, errors, and transcript updates use concise `aria-live` announcements without announcing audio chunks.
- The control respects reduced motion: the circle keeps state contrast but disables continuous waveform movement and morph travel.
- The transcript rail preserves text equivalents for live input and output.
- Color and motion are not the sole indicators of live state.

## Testing and Verification

Start with pure protocol tests before implementation code:

1. partial transcript chunks assemble in order;
2. a user activity event interrupts/clears playback state;
3. tool calls are parsed and invalid envelopes are rejected;
4. reconnect/resumption moves through bounded states;
5. ephemeral token responses cannot expose a permanent key.

Then add route tests for authorization and constrained token/tool requests, plus component tests for launcher/X state, circular sizing contract, transcript accessibility, and cleanup.

Verification must include TypeScript, targeted lint, build, desktop/mobile Playwright layout checks, an audio-playback mocked browser test, and a manual Live smoke session using a valid Gemini key. Provider errors, no microphone, interrupted output, and reconnection are mandatory smoke scenarios.

## Scope Boundaries

Included: Gemini Live integration, ephemeral token issuance, realtime PCM capture/playback, barge-in, live transcripts, server-side tool relay, Hermes memory handoff, and the circular minimal interface.

Excluded: OpenAI Realtime integration, voice cloning, a cross-provider abstraction, persistent raw audio storage, reworking Drive OAuth, reworking Mini-Run backend behavior, and restoration of the unrelated Brand Kit layer.

## Sources

- [Gemini Live API overview](https://ai.google.dev/gemini-api/docs/live-api)
- [Gemini Live WebSocket guide](https://ai.google.dev/gemini-api/docs/live-api/get-started-websocket)
- [Gemini ephemeral token guide](https://ai.google.dev/gemini-api/docs/live-api/ephemeral-tokens)
- [OpenAI Realtime API reference](https://platform.openai.com/docs/api-reference/realtime?lang=javascript)
