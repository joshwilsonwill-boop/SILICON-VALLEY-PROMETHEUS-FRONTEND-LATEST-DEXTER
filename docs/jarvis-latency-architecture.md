# Jarvis live assistant latency and resilience plan

## What the code does today

Jarvis voice connects the browser directly to Gemini Live after an authenticated session endpoint returns short-lived connection configuration. The browser sends microphone frames and typed turns over one WebSocket, receives audio/transcripts and tool calls, then applies editor actions through the voice companion bridge.

The inspected path had three avoidable costs or failure modes:

- The full project transcript was included in both the Live system instruction and a second pre-briefing turn. Large transcripts therefore increased initial context work and duplicated tokens. The pre-briefing was also sent as a complete user turn, which could cause an unsolicited assistant response before the user asked anything.
- Typed probes stopped microphone transmission for a fixed 2.5 seconds even though the text turn was already sent as a complete turn.
- WebSocket message handlers were asynchronous and could overlap while decoding blobs or awaiting tools. Setup timeout fallback could also spend up to 12 seconds on each API key, even though changing keys cannot repair a slow network route; a clean close before setup could leave connection handling ambiguous.

## Changes in this pass

- Session setup now sends only compact project metadata in the system instruction, without creating a phantom user turn. Spoken-content questions fetch bounded transcript excerpts through `search_video_transcript`, so the transcript remains local until a question needs it.
- Typed probes no longer pause microphone transmission for a fixed interval.
- Incoming server messages are processed in arrival order, including asynchronous message decoding and tool responses.
- Setup has one bounded eight-second deadline, a short compatibility fallback when a server omits `setupComplete`, and a clear failure if the socket closes before setup. Slow-network timeouts no longer serially retry the same endpoint with other keys.
- Alternate keys are tried only when the Live service explicitly identifies an authentication or quota rejection; generic socket/network failures do not cascade across credentials.

## Target architecture

### Browser turn path

1. Show explicit `connecting`, `listening`, `thinking`, and `speaking` states with elapsed time and a cancel/retry action. Keep status events in the client contract rather than inferring them from audio playback.
2. Keep one ordered event queue per socket. Tag turns with monotonically increasing IDs so late audio or tool results from an old turn can be discarded after interruption or reconnect.
3. Treat typed text as an atomic user turn. Keep voice activity independently gated, and release the gate from actual server turn events rather than arbitrary sleeps.
4. Record timings for click-to-socket-open, setup confirmation, first transcript, first audio, tool duration, and turn completion. Use privacy-safe timing and failure categories; do not log prompts, transcripts, or credentials.

### Network and session recovery

1. Separate credential failures from transport failures. Retry a rejected credential with another configured key only when the server response identifies an auth/quota cause; do not retry network timeouts with new keys.
2. Use bounded exponential backoff with jitter for recoverable socket closes, capped attempts, and a visible reconnect state. Resume only after setup is confirmed; do not silently replay a possibly executed edit or typed turn.
3. Apply a per-turn deadline and cancellation token. On timeout, stop stale audio, preserve the user transcript, explain the connection issue, and offer retry of the text turn. Mutating tool calls must remain at-most-once from the UI's perspective and return receipts before any replay is offered.
4. Add network emulation for high RTT, packet loss, and short disconnects. Track p50/p95 time-to-first-audio and successful turn completion by network class before selecting thresholds.

### Server and editor seams

1. Keep authenticated session creation as the only credential boundary. Prefer short-lived, scoped ephemeral credentials when the provider supports them; never expose long-lived service keys.
2. Give every tool a typed request/result schema, an explicit timeout, and an idempotency policy. Keep read-only tools concurrent only when dependencies allow it; serialize editor mutations and return action receipts.
3. Bound transcript retrieval by excerpt count and bytes, and include timestamps/segment IDs when available. Keep full transcript text in local editor state; send only evidence relevant to the current question.

## Suggested service objectives

Measure these first on representative browsers and regions, then set production SLOs from observed baselines:

| Measure | Initial target to validate |
| --- | ---: |
| Setup confirmation on a healthy connection | p95 under 2 seconds |
| First assistant audio after a short typed probe | p95 under 3 seconds |
| Recoverable disconnect visible to the user | under 1 second |
| Duplicate editor mutations after reconnect/retry | 0 |

The browser cannot guarantee a fast model response when the access network or provider is slow. It can avoid adding duplicate context and fixed waits, preserve ordering, bound setup stalls, and make degraded states recoverable and visible.
