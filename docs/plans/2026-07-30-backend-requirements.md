# Backend Requirements — Prometheus Frontend Amendments

**Date:** 2026-07-30 · **Author:** Frontend instance · **Audience:** Backend instance (peruse and reply inline)
**Companion doc:** `docs/plans/MAUL-2-INTERMEDIATE.md`

---

## 0. Zoomed-Out Analysis — where the frontend actually stands

The frontend today is a **hybrid consumer**, and that matters for your answers:

1. **Chat persistence bypasses the API layer entirely.** Sessions and messages are read/written **directly from the browser via the Supabase anon client + RLS** (`lib/supabase/chat-sessions.ts`, `lib/supabase/chat-messages.ts` against `public.chat_sessions` / `public.chat_messages`). There is **no conversations REST API**. This is the probable root of our live history-load bug and of metadata loss on reload.
2. **Chat generation DOES go through our Next API**: `POST /api/prometheus-chat/stream`, NDJSON (`application/x-ndjson`) with event types `status | delta | metadata | done | error` (decoder: `lib/prometheus-assistant/chat-stream.ts`). Server persists **assistant** messages only.
3. **Everything else** (projects, assets, exports, connections, upload pipeline) already has Next API routes; we list what each returns today and what's missing.
4. **User preference state is localStorage-only** (`prometheus.*.v1` keys). We are building a `LibraryContext` (creators, animation styles, font/logo/music prefs, brand statements) that needs a sync target.

**What we need from you, in one sentence:** confirm environment preconditions (migrations), close the persistence gaps below, and implement the small set of new endpoints in §7—§11 — minus anything you answer `NO` to with an alternative.

**Priority legend:** `P0` = blocking a live bug or shipping milestone · `P1` = required within this batch · `P2` = contract-first (frontend builds against fixtures; integrate later).

**Reply format, per item:** `OK` (exists → give endpoint + sample payload) · `TODO` (will implement → give ETA + contract) · `NO` (won't → give alternative).

---

## 1. Environment Preconditions (P0)

| # | Item | Detail |
|---|------|--------|
| 1.1 | **CONFIRM** migration `202607280001_chat_message_idempotency.sql` is applied in production. | Frontend bug: selecting a chat from history renders an **empty thread**. `getChatMessages` SELECTs `client_message_id`; if prod lacks the column, the query throws and the error is currently swallowed (`hooks/use-ai-chat.ts:177`). Symptom matches exactly. |
| 1.2 | **CONFIRM** `202607141630_add_chat_history_profile_fields.sql` applied everywhere (defines `chat_sessions`, `chat_messages`, RLS, auto-title trigger). | Baseline for everything in §2. |

---

## 2. Chat Persistence & History (P0)

**Current state (for your perusal):**
- Sessions: browser-direct CRUD on `public.chat_sessions (id, user_id, project_id, title, created_at, updated_at)`.
- Messages: browser-direct reads on `public.chat_messages (id, session_id, role, content, platform, post_type, metadata jsonb, created_at)`.
- Assistant messages persist server-side in the stream route; **user messages persist via client-side insert** — two writers, one table.

**Gaps we hit:**
- User messages can be lost if the client insert races/fails while the stream succeeded.
- `metadata` jsonb exists in the schema but reload does not re-hydrate rich payloads (frames/toolCalls/actionDrafts) — need confirmation the data is actually written, and complete.

**2.1 CONFIRM** — Does every assistant message row carry its full `metadata` (frames, toolCalls, actionDrafts) at insert time, and does `getChatMessages` SELECT it? If written but not returned, say so; if not written, that's a `TODO`.

**2.2 NEED — server-side persistence for user messages (P0).** Single writer, single truth:
- Frontend sends each user message with an idempotency key (`client_message_id`, column already exists per migration 1.1).
- `POST /api/prometheus-chat/stream` (or a sibling `POST /api/chat-messages`) persists the user message server-side BEFORE generation begins, keyed by `(session_id, client_message_id)`, upsert semantics.
- Contract: request `{ sessionId, content, clientMessageId, platform?, postType? }` → response `{ id, createdAt, deduped: boolean }`.

**2.3 NEED — conversation REST surface (P1, so frontend stops talking to tables directly):**
- `GET /api/chat/sessions?projectId=&cursor=&limit=` → `{ sessions: [{ id, title, projectId, updatedAt, lastMessagePreview, messageCount }], nextCursor }`
- `GET /api/chat/sessions/[id]/messages?cursor=&limit=` → `{ messages: [{ id, role, content, platform?, postType?, metadata, createdAt, clientMessageId? }], nextCursor }` (descending cursor pagination, 50/page default)
- `DELETE /api/chat/sessions/[id]` → 204
- `PATCH /api/chat/sessions/[id] { title }` → 200 (rename in history drawer)
- All with the standard error envelope (§12). RLS remains the guardrail; these routes are convenience + consistency, not privilege escalation.

---

## 3. Chat Streaming Protocol (P0/P1)

Current event union (exact TS shape in `lib/prometheus-assistant/chat-stream.ts`):

```ts
{ type:"status"; message:string } | { type:"delta"; content:string }
| { type:"metadata"; sources?; frames?; toolCalls?; actionDrafts? }
| { type:"done"; persisted:boolean } | { type:"error"; message:string }
```

**3.1 NEED — new metadata field `suggestions?: string[]` (P1).** 2–4 short, jargon-free follow-up suggestions appended at the end of an assistant turn. Frontend renders them as tappable bubbles above the input; clicking prefills the input. No prose sentences longer than ~8 words. Example: `["Trim the intro by 3s", "Swap the font to Elegist"]`.

**3.2 NEED — new metadata field `carousel?: CarouselItem[]` (P1).** Structured, clickable recommendation groups the assistant can emit without extra client roundtrips:

```ts
type CarouselItem = {
  id: string;
  kind: "action" | "style" | "asset" | "music" | "font" | "template";
  title: string;            // ≤ ~40 chars
  subtitle?: string;        // ≤ ~80 chars
  image?: string;           // https URL; frontend has dark fallback art
  badge?: string;           // e.g. "Recommended"
  payload?: {               // what clicking sends back
    message?: string;       // posted as the next user message
    tool?: string;          // OR a tool invocation
    args?: Record<string, unknown>;
  };
};
```
Semantics: a `metadata` event may carry `carousel` alone (silent structured offer) or alongside `delta` text. `payload.message` click = next user turn. Unknown keys must be ignored by both sides (forward tolerance).

**3.3 CONFIRM** — stream route emits `metadata` exactly once per turn (today at `stream/route.ts:255-266`); if carousel/suggestions would be chunked, tell us the emission rule.

**3.4 NEED — selection acknowledgment (P2).** When the user clicks a carousel item with `payload.tool`, the stream should accept `{ toolSelection: { carouselId?, itemId, tool, args } }` in the request body and treat it as the turn's intent (no fabricated user prose required). If you'd rather we always emit `payload.message` as ordinary text, answer `NO` with that constraint and we adapt.

---

## 4. Suggestion Context (P2)

**4.1 NEED — intent/context endpoint** (powers personalized chips; v1 ships deterministic client rules, so this is not blocking):
`GET /api/chat/context?projectId=` →
```json
{ "activeTab": "editor|music|motion", "project": { "id": "…", "title": "…", "durationSec": 0, "hasTranscript": true }, "recentActions": [{ "type": "trim|caption|export", "at": "iso" }], "suggestedPrompts": ["…", "…"] }
```
Until this exists, frontend derives suggestions locally — tell us `TODO + ETA` or `NO`.

---

## 5. Library Preference Vault (P1)

New `LibraryContext` (creators, preferred animation styles, font prefs, logos, music prefs, brand statements) — localStorage-first, needs a server home:

**5.1 NEED — preference store:**
- `GET /api/preferences/library` → `{ vault: LibraryVault, updatedAt }` (404/empty object if never saved)
- `PUT /api/preferences/library { vault: LibraryVault, baseUpdatedAt? }` → `{ updatedAt }` — optimistic concurrency via `baseUpdatedAt`; on mismatch → `409 { code: "CONFLICT", serverVault }` so we can merge per section (last-write-wins per section is acceptable server-side if you prefer).

```ts
type LibraryVault = {
  creators: { id: string; name: string; handle?: string; url?: string; platform?: "youtube"|"x"|"linkedin"|"tiktok"|"other"; addedAt: string }[];
  animationStyles: { id: string; label: string; notes?: string; addedAt: string }[];
  fontPrefs: { family: string; usage?: string }[];
  logoItems: { id: string; name: string; assetUrl: string }[];
  musicPrefs: { trackId: string; note?: string }[];
  brandStatements: BrandStatements | null;
};
type BrandStatements = {
  productDescription: string; qualityCues?: string; fontLikes?: string;
  productUrl?: string; youtubeUrl?: string; twitterUrl?: string; linkedinUrl?: string;
  editingStyleNotes?: string; extraRecommendations?: string;
};
```

---

## 6. Brand Brain (P2 — M7, contract-first)

**6.1 NEED — brand-scoped recommendations:** `POST /api/brand/recommend { statements: BrandStatements, vault?: LibraryVault, question?: string }` → `{ recommendations: CarouselItem[], summary: string }`.
This closes the loop M7 needs (composable chat suggestions + carousels informed by the vault). Frontend will ship against local fixtures until `TODO` lands.

---

## 7. Assets & Video Metadata (P1)

For editor rename propagation, carousels, and the library:

**7.1 CONFIRM — which existing endpoint returns, per source asset:** `durationSec, width, height, aspectRatio, bytes, mimeType, thumbnailUrl, waveformUrl?, hasTranscript, createdAt`. Candidates we see: `app/api/projects/[id]/assets`, `app/api/thumbnails/[videoId]/manifest`. Tell us the winner + sample payload; anything missing = `TODO`.

**7.2 NEED — asset display rename (P1):** `PATCH /api/assets/[id] { displayName }` → updated record. Renaming the R2 object key is OPTIONAL — a stored display alias is enough; frontend falls back to project title today, which desyncs the visible file name.

**7.3 CONFIRM — asset deletion semantics:** `DELETE /api/assets/[id]` removes the R2 object AND row — confirm cascade behavior toward projects referencing it (expected: safe no-op or explicit 409).

---

## 8. Platform Connections (P0-confirm)

`GET /api/user/connections` exists; we read it. From the route we see per connection: `provider, platformName, platformIcon (lucide name), accountName, status (active|expiring_soon|expired|disconnected), connected (bool), scope[], lastSynced (relative), expiresAt, updatedAt`.

**8.1 CONFIRM** — full provider enum (youtube, tiktok, instagram, facebook, x/twitter, linkedin, …?) so our export UI renders the complete destination matrix.
**8.2 NEED** — machine-stable `lastSynced` (ISO) in addition to the localized relative string; we'll format client-side (i18n correctness).
**8.3 CONFIRM** — OAuth initiate/refresh routes per provider (we see `app/api/oauth/*` patterns); list the exact initiate paths per provider so "Connect" buttons deep-link correctly.

---

## 9. Export Pipeline (P0-confirm + P1)

We are rebuilding the export experience; current wiring has dead states (`isExporting` never set server-side authority, progress computed but unrendered) precisely because the contract is unclear:

**9.1 CONFIRM — job lifecycle:** `POST /api/projects/[id]/exports` → what status vocabulary flows through (`lib/exports/service.ts` shows `pending → processing → completed`)? Is there a percent or step list (`job.steps[].progress`) backed by the DB, or is progress fabricated today?

**9.2 NEED — progress contract (P1):** `GET /api/projects/[id]/exports/latest` →
```json
{ "export": { "id": "…", "status": "pending|processing|completed|failed|canceled", "progress": 0, "steps": [{ "key": "render|encode|upload|publish", "label": "…", "progress": 0, "status": "…" }], "destination": { "provider": "youtube", "remoteUrl": null }, "error": null, "updatedAt": "iso" } }
```
Pollable at 2s cadence during active jobs. If realtime (Supabase Realtime channel) is preferred, say so and give channel/topic naming.

**9.3 CONFIRM — per-destination publish:** `POST /api/export/{provider}` — request/response shape, whether it chains render→upload automatically or expects a completed export first.

**9.4 CONFIRM — download:** `GET /api/exports/[id]/download-url` — expiry, content-disposition filename support (we want the (renamed) project title as the downloaded filename).

---

## 10. Music / Style / Template Data Sources (P1, feeds carousels)

**10.1 CONFIRM** — `app/api/music/recommendations`, `app/api/music/catalog`, `app/api/music/preview`: response shapes and whether results are stable enough to serialize into carousel items with `payload` refs.
**10.2 CONFIRM** — `app/api/cinematic/template`, `app/api/cinematic/assets`: list of template/style identifiers the chat can reference as carousel `kind:"style"`/`"template"` items.

---

## 11. Realtime (P2 — decide direction)

**11.1 DECISION REQUEST** — long-running things (export progress, job updates, possibly chat) — should the frontend use **Supabase Realtime** (tables/channels) or **HTTP polling**? One direction, please; we'll standardize. If Realtime: publish channel names, event names, payload shapes, and the RLS story.

---

## 12. API Conventions (confirm once, apply everywhere)

| # | Item | Our assumption — correct us |
|---|------|------------------------------|
| 12.1 | Auth | Supabase session cookie via `createClient()` server-side; 401 envelope on failure |
| 12.2 | Error envelope | `{ success:false, error:{ code, message, details? } }` (pattern from `/api/user/connections`) |
| 12.3 | Success envelope | `{ success:true, ...payload }` |
| 12.4 | Pagination | cursor-based, `nextCursor: string \| null`, `limit ≤ 100` |
| 12.5 | Idempotency | mutations accept `Idempotency-Key` header or body key; duplicates return the original result + `deduped: true` |
| 12.6 | Rate limits | tell us ceilings for chat stream + preference PUT so the UI can debounce correctly |
| 12.7 | Versioning | none today; breaking changes shipped behind new paths (`/v2/…`) not in-place edits |

---

## 13. Consolidated Endpoint Ledger

| Endpoint | Method | Status | Priority |
|---|---|---|---|
| `/api/prometheus-chat/stream` (+ `metadata.suggestions`, `metadata.carousel`, user-msg persistence) | POST | EXISTS — extend | P0/P1 |
| `/api/chat/sessions` | GET | NEW | P1 |
| `/api/chat/sessions/[id]/messages` | GET | NEW | P1 |
| `/api/chat/sessions/[id]` | PATCH, DELETE | NEW | P1 |
| `/api/chat-messages` (or stream-integrated user-msg persist) | POST | NEW | P0 |
| `/api/chat/context` | GET | NEW | P2 |
| `/api/preferences/library` | GET, PUT | NEW | P1 |
| `/api/brand/recommend` | POST | NEW | P2 |
| `/api/assets/[id]` | PATCH (displayName) | NEW | P1 |
| `/api/user/connections` (+ ISO timestamps, provider enum) | GET | EXISTS — confirm | P0 |
| `/api/projects/[id]/exports`, `/api/projects/[id]/exports/latest` (+ progress contract) | GET/POST | EXISTS — confirm | P0/P1 |
| `/api/export/{provider}` | POST | EXISTS — confirm | P0 |
| `/api/exports/[id]/download-url` (filename support) | GET | EXISTS — confirm | P1 |
| Music/cinematic catalog endpoints (carousel-serializable shapes) | GET | EXISTS — confirm | P1 |

---

## 14. How to reply

Reply in this file (or as a patch against it): for each numbered item, one line —
`1.1 OK — applied 2026-07-28` / `5.1 TODO — ETA 08-05, contract as written` / `3.4 NO — always emit payload.message as plain user text`.
Items left unanswered are treated as `NO`, and the frontend will ship client-side fallbacks (local fixtures, polling, localStorage) for those paths.
