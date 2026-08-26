# Hermes — Prometheus Voice Agent

Hermes is a Gemini-backed voice agent for the Prometheus product. It talks, remembers, and routes the task: it can ground answers in the Prometheus knowledge base, recall the caller's facts/preferences, read the caller's Google Drive, and dispatch Mini-Run render jobs — all through a single conversational turn.

- **Persona:** Hermes, the Greek god of messengers. **Gender:** male.
- **Tagline:** "Your Prometheus voice agent — it talks, remembers, and routes the task."
- **Logic only, no UI.** Any client (CLI, websocket, future React surface) can render a `HermesAgentResult` without knowing anything about Gemini/Drive/memory.

## Why it exists

The product already had a knowledge RAG path and a Mini-Run dispatch path, but no single agent that could **hold a conversation** and **call those tools** on the user's behalf. Hermes is that agent.

## Architecture

```
      transcript ───────────────┐
                                ▼
        app/api/hermes/agent/route.ts   (GET identity · POST turn)
                                │  auth + memory-store + drive-token + mini-run env
                                ▼
     lib/hermes/index.ts  →  handleHermesTurn()   (context + memory + persist)
                                │
                                ▼
     lib/hermes/gemini.ts  →  runHermesTurn()     (Gemini agent loop)
                                │
        ┌───────────────────────┼───────────────────────┐
        ▼                       ▼                       ▼
  lib/hermes/tools.ts     lib/hermes/memory.ts   lib/hermes/supabase-memory.ts
  (tool executor)        (snippet/rank store)    (Supabase-backed store)
```

### The agent loop (`runHermesTurn`)

Uses **`generateContent`** (not `startChat`) — Gemini 3.x rejects the SDK's legacy `function` role for function responses. Tool calls are emitted under `model` and function responses are fed back under `user`, so the loop is:

1. Send utterance (+ prior turns).
2. If the model emits `functionCall`s, execute each and append `functionResponse`.
3. Repeat (bounded by `maxRounds`, default 3).
4. Return the final spoken text plus every tool call made.

Tool declarations are sent on **every** round, so the model is always tool-aware.

### Memory

Snippet/rank-based (no vector embeddings). Records are categorized as `fact` / `preference` / `task` / `file_snippet`. Salient snippets are extracted from the transcript and the reply, compacted to bound size, and persisted after each turn. `extractSalientSnippets` and `compactHermesMemory` live in `lib/hermes/memory.ts`.

## Tool surface

| Tool | Backed by | Result |
| --- | --- | --- |
| `search_hermes_knowledge` | `retrievePrometheusKnowledge` | ranked knowledge snippets |
| `hermes_recall_memory` | `HermesMemoryStore.recall` | stored memory |
| `list_google_drive_videos` | Google Drive API via `getValidAccessToken` | file list (Drive-gated) |
| `dispatch_mini_run` | `dispatchMiniRunRender` | render job id |

All tools are declared in `lib/hermes/tool-definitions.ts` and executed by `createHermesToolExecutor` in `lib/hermes/tools.ts`.

## API

**`GET /api/hermes/agent`** — identity + health:
```json
{ "status": "ok", "agent": { "name": "Hermes", "gender": "male", ... },
  "model": "gemini-2.5-flash", "driveConnected": false }
```

**`POST /api/hermes/agent`** — one turn. Body:
```json
{
  "transcript": "Make me a short from my b-roll in Drive.",
  "userId": "optional (defaults to session user, then 'anonymous')",
  "sessionId": "optional", "userName": "optional", "brand": "optional",
  "messages": [ { "role": "user", "content": "..." } ],
  "driveAccessToken": "optional short-lived token"
}
```

Response (`HermesAgentResult`):
```json
{
  "schemaVersion": "1.0",
  "agent": { "name": "Hermes", ... },
  "reply": "I found one video: b-roll intro.mp4.",
  "intent": "drive",
  "toolCalls": [ { "name": "...", "status": "ok", "summary": "...", "payload": {} } ],
  "memory": { "persisted": true, "added": 3, "recalled": 2 },
  "sources": [ { "title": "...", "kind": "knowledge" } ]
}
```

`intent` is one of `chat | memory | task | drive | render | handoff`. `sources` is a de-duplicated, title-capped list for citation UI.

## Call-transcript handling

The AssemblyAI transcribe route already produces a `transcript`. Feed that string as `POST /api/hermes/agent` `{ "transcript": "..." }`. `handleHermesTurn` uses it as the user message, recalls matching memory, and persists new salient snippets.

## Configuration

- `GEMINI_API_KEY` — required. Must be a real Gemini key (the `AQ.…` pseudo-token is *not* valid).
- `HERMES_MODEL` — optional pin. Default `gemini-2.5-flash` (stable, proven tool caller). Fallback chain: `gemini-2.5-flash → gemini-3.6-flash → gemini-3.5-flash`.
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` — required only for real Drive access (via the `google_drive` OAuth provider).
- `MINI_RUN_BACKEND_URL` / `MODAL_PROXY_KEY` / `MODAL_PROXY_SECRET` — required only for `dispatch_mini_run`.
- `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` — required for cross-turn memory. Without Supabase, Hermes falls back to an in-memory store (session only).

## Drive wiring

Drive goes through the real OAuth flow. On each turn the route resolves a short-lived access token via `getValidAccessToken(userId, 'google_drive')` (or from the caller's `driveAccessToken`). `list_google_drive_videos` returns `needs_google_drive` when no token is present, and the agent tells the caller to connect their Drive in settings.

A pasted `AQ.…` token is **not** a valid Drive access token (returns 101/401); it is not a Gemini key either.

## Testing

- `npx tsx scripts/hermes-probe.mjs` — verify the Gemini key is live and lists models.
- `npx tsx scripts/hermes-smoke.ts` — live two-turn smoke (knowledge + Drive + memory retention). Print `SMOKE OK`.

```bash
HERMES_MODEL=gemini-2.5-flash npx tsx scripts/hermes-smoke.ts
```

> Note: free-tier Gemini quota is ~5 generate-content requests/min/model. If you see a `429` during testing, wait ~5s and retry; don't run many probes back-to-back.

## Module map

- `lib/hermes/types.ts` — shared contract (`HermesRequest`, `HermesAgentResult`, …).
- `lib/hermes/identity.ts` — persona + `hermesSystemPrompt`.
- `lib/hermes/gemini.ts` — `runHermesTurn` agent loop + model resolution.
- `lib/hermes/memory.ts` — snippet/rank memory, salient extraction, compaction.
- `lib/hermes/tool-definitions.ts` — Gemini function declarations.
- `lib/hermes/tools.ts` — `createHermesToolExecutor` + result normalization.
- `lib/hermes/supabase-memory.ts` — Supabase-backed store (falls back to in-memory).
- `lib/hermes/index.ts` — `handleHermesTurn` orchestrator.
- `app/api/hermes/agent/route.ts` — HTTP route.
