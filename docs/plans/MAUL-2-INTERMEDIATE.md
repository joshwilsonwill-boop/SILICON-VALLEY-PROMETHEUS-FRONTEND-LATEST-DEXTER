# MAUL 2, INTERMEDIATE — Frontend Amendments Master Strategy & Milestone Plan

- **Formerly:** 2026-07-30-frontend-amendments-master-plan.md

- **Date:** 2026-07-30
- **Status:** STRATEGIZED — pending "Go" per workflow gates
- **Source:** Stakeholder voice notes (Matthew Twain, 30.07.2026 00:21–00:31)
- **Quality bar:** awwwards-grade. This document defines the benchmark so it is never diluted; every milestone lists measurable acceptance criteria against it.
- **Governance:** `prometheus-launch-discipline`, `prometheus-strat`, `safe-implementation`

---

## 0. Strategic Sign-off (prometheus-strat)

```markdown
# STRATEGIC SIGN-OFF
## Feature: Frontend Amendments Batch 2026-07-30 (9 workstreams)
## Date: 2026-07-30
## Status: APPROVED WITH CONSTRAINTS (per-milestone execution)

### Gates Passed: 9/10 (Gate 8 Conversion/Revenue = conditional, see M6)

### Critical Risks Identified:
1. Dual drifting token systems (tailwind.config.ts vs app/globals.css @theme) → Consolidate FIRST in M0 or every redesign page forks the drift further.
2. Chat-history bug root cause is environmental (migration 202607280001 may be unapplied in prod) → Verify migration before code; code must fail LOUDLY, not silently.
3. app/editor/[id]/page.tsx is 8,665 lines and on the Hard-Stop list → Surgical edits only; no whole-file rewrites.
4. Font licensing (Bellavoir "PERSONAL USE ONLY", Migra personal license) → Do NOT introduce either into new surfaces; use Vogue/Elegist (already in repo) for display type.
5. "Features behind collapsibles" risks clutter resurfacing → One hero focal point per chamber, enforced via benchmark B-01.
6. Glow/blur ambitions (awwwards look) on low-end Android (Mali/3GB) → Lite tier: opacity-based glows, max 1 backdrop-blur per view, Reduce Motion respected.

### Simplifications Recommended:
1. Library: instead of a new backend store, extend the localStorage vault pattern (prometheus.*.v1) behind a new LibraryContext; backend sync comes later via the requirements spec.
2. Suggestion bubbles: wire the ALREADY-EXISTING unused machinery (ai-chat-suggestions.tsx, CHAT_QUICK_ACTIONS, PrometheusChat actions prop) instead of a new chip system.
3. Carousel: reuse the message-bubble frame-strip interaction pattern; no embla-carousel unless touch physics prove necessary.
4. Rename: PATCH endpoint + inline input already exist (EditorHeader.tsx:79-95) — polish affordance & propagation; build no new rename machinery.

### Business Impact:
- Conversion: + (broken chat history & mock-labeled settings read "unfinished" to paying evaluators)
- Retention: + (personal preference curation = product stickiness)
- Brand perception: ++ (this batch IS the brand bar)

### Coding Agent Notes:
- Branch per milestone (feat/…), never on main. Current branch: main — FIRST ACTION before any code.
- Additive-only rules apply (safe-implementation). Deletions authorized ONLY for: hardcoded seed clutter in components/assets/cinematic-library.tsx, "mock/UI-only" placeholder COPY in settings/profile, and dead branches explicitly listed per milestone.
- Baseline required before M0: npm run typecheck, npm run lint, npm run build — record in audit-artifacts/amendments-2026-07-30/baseline.md.
- Performance budget: no redesign page may regress route JS by >30KB gz without written justification.
- Every UI milestone ships visual proof (scripts/capture-* → audit-artifacts/<milestone>/).

### Signed: Strategic Advisor Agent
```

---

## 1. Quality Benchmarks — "awwwards is never diluted"

Applicable to EVERY milestone that touches UI. A milestone is not complete until all B-codes pass.

| Code | Benchmark | Measurable Gate |
|------|-----------|-----------------|
| B-01 | One hero focal point + one control cluster + one secondary rail per view | Visual proof screenshot; no view ships with ≥2 competing display-type blocks |
| B-02 | Typography hierarchy | Display: Vogue / Elegist via existing `next/font` vars; body Inter; display letter-spacing −0.05em to −0.02em; NEVER Inter as display on new surfaces |
| B-03 | Color & contrast | Fully dark backgrounds (surface scale `--void`→`--surface-elevated`); body text ≥ 4.5:1; secondary ≥ 3:1; accents only on affordances |
| B-04 | Motion grammar | Springs 160–360 stiffness / 18–30 damping (CINEMATIC_INTERFACE_SYSTEM.md); hover 140–220ms; max 3 simultaneous motion layers + reduced-motion fallback |
| B-05 | Materials | Glass = hierarchy signal only; ≤2 stacked translucent layers; no radial glow blobs; one hairline highlight + one shadow family per component |
| B-06 | Spatial rhythm | 8/12/16/24/32 spacing scale; rows 68–84px; 24px inner gutter; hover scale ≤1.03 |
| B-07 | Accessibility | 44×44px touch targets; visible focus ring (`--focus-glow`); sane tab order; aria-labels on icon-only controls; `prefers-reduced-motion` honored |
| B-08 | Performance | 60fps interactions mid-tier; lite tier (no stacked blur) on low-end Android; route JS delta ≤30KB gz |
| B-09 | No mock/truth leakage in UI copy | Zero user-visible strings containing "mock", "UI-only", "placeholder", "scaffold" |
| B-10 | Consistency | Uses consolidated tokens from M0-1 only; no new hardcoded hex outside the token file |

Reference ethos: Apple HIG restraint + Linear/Raycast craft + awwwards award-winners' cinematic confidence — per `docs/CINEMATIC_INTERFACE_SYSTEM.md`.

---

## 2. Branch Strategy (Git Gate)

- Current branch: `main`. **No code lands on main.**
- One branch per milestone: `chore/design-token-consolidation`, `fix/editor-rail-z-index`, `fix/chat-history-load`, `feat/chat-suggestion-chips`, `feat/chat-carousel`, `feat/editor-rename-polish`, `feat/library-curation-v1`, `feat/settings-redesign`, `feat/profile-redesign`, `feat/export-redesign`.
- Commit only intended files. The working tree already carries unrelated modified files (LibreUIUX skill repo + CRLF churn) — never stage those.

---

## 3. Milestones

### M0 — Foundations (blocks everything)

**M0-1 Token consolidation**
- Single source of truth: `app/globals.css` (the loaded one). Do not delete `styles/globals.css` / `styles/editor-theme.css`; mark them deprecated in a header comment.
- Add missing motion tokens: `--dur-hover:180ms; --ease-hover:cubic-bezier(0.16,1,0.3,1); --ease-structural:cubic-bezier(0.22,1,0.36,1);` + spring presets per the Cinematic doc.
- Align `tailwind.config.ts` to the same vars; record vars existing only in the JS config.
- **Accept:** no NEW hardcoded hex in the milestone diff; B-04/B-10 satisfied.

**M0-2 Backend requirements file** — `docs/plans/2026-07-30-backend-requirements.md` (companion file, kept short per stakeholder instruction).

**M0-3 Baseline + evidence harness**
- Run `npm run typecheck`, `npm run lint`, `npm run build`; log to `audit-artifacts/amendments-2026-07-30/baseline.md`.
- Confirm screenshot harness (`scripts/capture-phase2-rail-hover.mjs` as prior art) for per-milestone visual proof.

---

### M1 — Bug Painkillers (branches: `fix/*`)

**M1-1 Sidebar hover overlay bug** (`fix/editor-rail-z-index`)
- Symptom: hovering the editor rail (`AwwwardsSidebar`, expands 72→216px as `absolute z-30` overlay) lets the command island (Editor/Music/Motion pill, header `z-[100]`) render ON TOP of the expanded rail.
- Root cause: `components/sidebar/AwwwardsSidebar.tsx:118` (z-30) vs `components/editor/EditorHeader.tsx:72,116` (z-[100]); rail mounts in `components/editor/EditorRouteShell.tsx:115` (`relative z-30`).
- Fix: z-index contract in the token layer (`--z-rail-collapsed/--z-rail-expanded/--z-header`). Expanded rail panel z > 100 so it covers the island; collapsed rail keeps island fully usable. Drive via `data-expanded` attribute — no JS width checks.
- Visual proof: capture rail collapsed + expanded; assert island covered when expanded.
- **Accept:** B-04/B-06; hover-expand never paints the pill above the rail; island hover-reveal (Undo/Redo/export) unaffected when rail collapsed.

**M1-2 Chat history click-to-load** (`fix/chat-history-load`)
- Flow: `prometheus-chat-history-row.tsx:92` → drawer `onSelect` (`prometheus-chat-history-drawer.tsx:163-166`) → `selectSession` (`hooks/use-ai-chat.ts:514-527`) → `loadSessionMessages` (`:158-183`) → `getChatMessages` (`lib/supabase/chat-messages.ts:28-38`).
- Ranked causes: (1) migration `supabase/migrations/202607280001_chat_message_idempotency.sql` (`client_message_id` column) unapplied in the target DB → SELECT throws → swallowed at `use-ai-chat.ts:177-180` (console.warn only); (2) silent-by-design failure leaves an empty thread; (3) reload drops metadata payloads (frames/toolCalls not re-hydrated).
- Fix: (a) verify/report the migration precondition; (b) surface failures — explicit error state in the thread + toast, never silent; (c) defensive handling or documented migration precondition; (d) regression test for click→load (existing `tests/prometheus-chat-history.test.ts` covers utils only — close that gap).
- **Accept:** clicking any history row loads messages OR shows an explicit error; never a silent empty thread.

**M1-3 Video file rename polish** (`feat/editor-rename-polish`)
- Existing machinery: inline input `EditorHeader.tsx:79-95`; save `handleTitleSave` (`app/editor/[id]/page.tsx:6566-6602`) → `PATCH /api/projects/[id]`.
- Ask: hovering the file name must visually invite editing (highlight state); rename reflects everywhere (`sourceAssetLabel` `page.tsx:6508`, motion canvas, assets surfaces).
- Fix: hover highlight + pencil affordance + tooltip; audit all title/label consumers to guarantee propagation on save.
- **Accept:** rename in header updates every surface the name appears on; no extra network call beyond the existing PATCH.

---

### M2 — Chat Intelligence Substrate (branches: `feat/chat-*`)

**M2-1 Suggestion bubbles** (`feat/chat-suggestion-chips`)
- Render exactly **4** symmetric chips above the chat input (desktop slot `PrometheusChat.tsx:281-326`; mobile above `prometheus-chat-mobile.tsx:143-149`).
- Consolidate the three dormant mechanisms into ONE `ChatSuggestions` component: unused `components/editor/ai-chat-suggestions.tsx`, dead-rendered `CHAT_QUICK_ACTIONS` (`page.tsx:1009-1035`, chip row in a `false ?` branch at `:3646`), and the never-rendered `actions` prop (`PrometheusChat.tsx:33-37`).
- Copy rule: no jargon/protocol flavor ("too much language deviation"). Text = suggestive actions contingent on user intent: current workspace tab (Editor/Music/Motion), project presence, last message. Deterministic client-side rules — NO backend for v1.
- Click → prefill draft via existing `setDraft` (user still presses send).
- Layout: equal-width chips, one row desktop / 2×2 mobile; spacing per B-06; hover per B-04.
- **Accept:** B-01..B-07; chips switch with workspace tab context; buttons keyboard-accessible (44px, focus ring); new regression test `tests/chat-suggestion-chips.test.mjs` in the existing chat-test idiom.

**M2-2 Chat carousel** (`feat/chat-carousel`)
- Payload: `carousel?: CarouselItem[]` on the NDJSON `metadata` event (`lib/prometheus-assistant/chat-stream.ts:1-12`), normalized in `use-ai-chat.ts:326-353`, surfaced on `AIChatMessage`, rendered as `ChatCarousel` inside `PrometheusMessageBubble` (pattern reuse: frame-strip `PrometheusChat.tsx:406-442`).
- `CarouselItem = { id, title, subtitle?, image?, badge?, payload }`; click sends selection via existing `sendMessage(payload)` — selection works WITHOUT new backend roundtrips; static/demo payloads supported (stakeholder: options must not require conversing with the backend).
- Persistence: carousel must survive session reload via message `metadata` (flagged in backend spec §Chat).
- **Accept:** renders 3–8 items, scroll-snap, keyboard-navigable, click posts correct payload, static payload demo works server-free; B-04/B-07.

---

### M3 — Library: "Curation of Personal Editing Preferences" (`feat/library-curation-v1`)

Reality: library = `/assets` (`app/assets/page.tsx`); ALL clutter is hardcoded seed data in `components/assets/cinematic-library.tsx`; zero network calls today.

**M3-1 Strip the noise (deletion explicitly authorized by stakeholder)**
- Remove: `badge:'Featured'` cards (`:708-787`), `FOUNDER_ARCHIVE_PROFILES` + "Library stack" (`:597-675`, `:995-1022`, render `:387-409`), "2026 • Business, Strategy" meta lines (`:327-331`), founder strip (`FOUNDER_STRIP :50-58`).
- Keep: hover-tilt cards, showcase shell, music catalog seeds for the Music tab.

**M3-2 New IA (personal vault)**
- Tabs become preference domains: **Movies/Uploads · Music · Creators · Fonts · Logos · Text & Animation Styles** (maps "text, movies, music, people, fonts, logos" from the notes; Creators = "people").
- New `contexts/LibraryContext.tsx` (app-wide provider): uploads, creators, animationStyles, fontPrefs, logoItems, musicPrefs. Persistence localStorage-first (`prometheus.library.v2`); backend sync defined in spec §Preferences, plugged in later.

**M3-3 Creator + Style pads ("the label & pad")**
- (a) **Preferred Creators** pad: label + input to add creator (name/handle/link) → refined card/chip.
- (b) **Preferred Animation & Text Styles** pad: add style descriptors ("kinetic type", "2D lower-thirds", …).
- Designed empty states — this surface is the user's taste profile; adding taste must feel premium.

**M3-4 Brand statements intake (v1 frontend-only)**
- Composer ("Describe your brand"): product description, quality cues, font likes, product URL, YouTube/Twitter/LinkedIn channels, editing-style notes → `brandStatements` in LibraryContext. Open-ended chat/API consumption later via spec §Brand Brain.
- **Accept:** B-01..B-09 across the page; grep-verified zero "Featured/Archive/2026 Business Strategy" remnants; creators/styles persist across reload; fully dark, chamber-composed.

---

### M4 — Settings Redesign (`feat/settings-redesign`)

- `app/settings/page.tsx`: rebuild the hub as a **cinematic index** — full-bleed dark (`--void`→`--surface-elevated`), one display-type hero statement, then a minimal vertical index: Profile / Privacy & cookies / Notifications / Integrations / Billing / Security.
- Remove ALL mock-scaffold copy (audit `docs/audits/ui-visual-audit-2026-07-08.md:337-361,468-473`): "Mock toggles for future alerts", "UI-only", "(UI scaffolding)" strings, mock Safe-mode toggle → replaced with honest designed sections or omitted.
- One distinctive lucide icon per destination (today the same generic `Shield` repeats 3×); 44px rows; hover = subtle translate + hairline reveal (B-04/B-06).
- Strengthen discovery: add a clear entry into `/settings` from the studio shell (today only reachable via editor-internal panel or direct URL).
- **Accept:** B-01..B-09; grep zero mock-copy; every row navigates; mobile parity screenshots.

---

### M5 — Profile Reform (`feat/profile-redesign`)

- `app/settings/profile/page.tsx` (1,668 lines): re-SKIN, don't re-PLUMB — preserve all working handlers (`useAuth`, `useProfile`, avatar upload/crop, preference stores, sync clients) per safe-implementation.
- Restructure into collapsible sections (create `components/ui/accordion.tsx` — Radix accordion 1.2.2 is installed but unwrapped): Account Identity / Workspace Feel / Notifications & Playback / Security / Data & Privacy / Danger. Collapsed by default; state remembered per session.
- Fully dark, minimal; avatar as the single hero object (B-01); iconic per-section icons; `Saved ✓` hack strings → proper inline token-based feedback.
- Remove mock residue (mock API key `pk_live_demo_...` at `:156`, mock sessions, fake 800ms `delay()`) → honest states (disabled-with-reason or real handlers).
- **Accept:** B-01..B-09; manual logic verification — every previous save path still functions.

---

### M6 — Export Experience (`feat/export-redesign`)

**Fix dead wiring first (trust):**
- `handlePrepareExport` (`page.tsx:7519`) only opens a drawer; `isExporting` (`:6518`) never set; `connectedPlatforms` hardcoded all-false (`cinematic-export-cluster.tsx:153-156`); `progressPercent` computed (`:6998-7001`) but rendered nowhere; `ExportPanel.tsx:54-59` is a fake timer machine.

**Then the ceremony:**
- `CinematicExportCluster` tray + `ExportDrawer` + `ExportPanel` share one language: dark glass chamber, release-map as connected nodes, REAL connection status from `/api/user/connections`, honest progress (poll `/api/projects/[id]/exports/latest`; align with `ExportService` statuses pending→processing→completed), restrained completion state (one success-pop, B-04).
- Drunk-user test: Export findable in <2s desktop AND mobile; keep cluster position (muscle memory, Gate 2).
- **Accept:** zero fabricated states; real connection state everywhere; visible end-to-end progress; mobile uses the real state machine; B-01..B-08.

---

### M7 — Brand Brain / Preference Companion (stretch — blocked on backend reply)

- Companion (chat or structured intake) that reads brand statements + preference vault to drive suggestions, recommendations, editing defaults.
- Frontend builds against the CONTRACT only (TypeScript types + local fixtures) so integration is a plug-in step once the backend instance answers `docs/plans/2026-07-30-backend-requirements.md`.

---

## 4. Sequencing & Effort

| Milestone | Type | Depends on | Size |
|-----------|------|-----------|------|
| M0 Foundations | chore | — | S |
| M1-1 Sidebar z-fix | bug | M0-1 | XS |
| M1-2 Chat history | bug/diagnose | — | S |
| M1-3 Rename polish | ui-bug | — | XS |
| M2-1 Suggestion chips | feature | M0 | S |
| M2-2 Carousel | feature | M0 | M |
| M3 Library curation | feature | M0 | L |
| M4 Settings | redesign | M0 | M |
| M5 Profile | redesign | M0, M4 | M |
| M6 Export | redesign+fix | M0 | M |
| M7 Brand Brain | contract-first | backend reply | M |

Execution order: **M0 → M1-1 → M1-2 → M1-3 (quick wins, trust) → M2-1 → M2-2 → M4 → M5 → M6 → M3 → M7.**

## 5. Validation Gates (every milestone)

1. `npm run typecheck` clean; `npm run lint` no NEW errors; `npm run build` passes first attempt.
2. Existing regression tests in `tests/` green + new tests for M1-2, M2-1, M2-2.
3. Visual proof in `audit-artifacts/amendments-2026-07-30/<milestone>/`.
4. `git diff --stat` reviewed; no file >50% changed without written justification; no unintended files staged.
5. B-01..B-10 checklist filled per milestone.
6. No secrets in diff; no schema/RLS changes without explicit approval (Hard Stop).

## 6. Open Questions (resolved with stated defaults — correct me if wrong)

1. **"People" tab** → interpreted as Preferred Creators. Default: tab named **Creators**.
2. **"Frames"** → read as the Archive/Featured "frames" (clutter), not a new tab.
3. **Suggestion bubbles** → deterministic client rules v1; AI personalization moves to M7.
4. **Rename "reflect into the file"** → v1 scope = project title everywhere it renders; underlying R2 media-file rename is backend work (spec §Assets), out of v1.
5. **Settings scope** → redesign targets `/settings`; the editor-internal `SettingsPanel` stays untouched.

## 7. Risk Register

- **R1** Big-bang redesign temptation → per-milestone branches + screenshots keep diffs reviewable.
- **R2** 8,665-line editor page edits → surgical edits only, listed line ranges.
- **R3** localStorage-first library diverges from backend later → v2 key + LibraryContext seam make migration a single adapter.
- **R4** Carousel payloads desync from backend stream → schema pinned in backend spec; tolerant parser (unknown fields ignored).
- **R5** Device-tier regressions (glow-heavy look) → lite-tier rules (B-08) + reduced-motion checks in every milestone's acceptance.
