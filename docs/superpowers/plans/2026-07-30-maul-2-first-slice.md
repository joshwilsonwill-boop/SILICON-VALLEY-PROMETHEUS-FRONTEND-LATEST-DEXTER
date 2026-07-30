# MAUL 2 First Slice Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Finish and verify MAUL 2 milestones M0, M1-1, M1-2, M1-3, and M2-1 while adding Prometheus's approved Editorial Cinema text choreography.

**Architecture:** Preserve the existing editor, chat, and rename contracts. Add one isolated presentational primitive for grapheme-level text motion, keep design tokens in `app/globals.css`, and integrate the primitive only at focal empty-state/hero call sites. Treat the current dirty worktree as inherited in-progress work: audit each changed file fully, correct it surgically, and stage milestone files explicitly.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Tailwind CSS 4, Framer Motion 12, Lucide React, Supabase, Node regression scripts.

---

## File Map

- Create `components/ui/cinematic-text-reveal.tsx`: accessible Measured Reveal and Editorial Hard Cut text choreography.
- Create `tests/cinematic-text-reveal-regression.test.mjs`: structural and contract coverage for segmentation, accessibility, reduced motion, and variants.
- Create `tests/chat-suggestion-chips.test.mjs`: deterministic four-chip behavior and desktop/mobile integration coverage.
- Modify `app/globals.css`: authoritative motion, z-index, display-font, and reduced-motion tokens.
- Modify `tailwind.config.ts`: aliases for the authoritative CSS variables only.
- Modify `components/sidebar/AwwwardsSidebar.tsx`: expose expansion state without layout breakpoints.
- Modify `components/editor/EditorRouteShell.tsx`: apply the rail/header z-index contract.
- Modify `components/editor/EditorHeader.tsx`: rename hover/focus affordance while retaining the existing handlers.
- Modify `app/editor/[id]/page.tsx`: remove dormant quick-action code, pass workspace context, and preserve rename propagation.
- Modify `lib/supabase/chat-messages.ts`: known-schema fallback and defensive message mapping.
- Modify `hooks/use-ai-chat.ts`: explicit history-load error/retry and suggestion metadata normalization.
- Modify `lib/prometheus-assistant/chat-stream.ts`: tolerate structured `suggestions` metadata.
- Modify `components/editor/PrometheusChat.tsx`: desktop history failure state, focal text reveal, and contextual chips.
- Modify `components/editor/prometheus-chat-mobile.tsx`: mobile parity for failure state, focal text reveal, and contextual chips.
- Modify `components/editor/ai-chat-suggestions.tsx`: deterministic suggestion rules and stable accessible grid.
- Update `audit-artifacts/amendments-2026-07-30/`: baseline, per-milestone screenshots, and final verification ledger.

### Task 1: Freeze The Baseline And Token Contract

**Files:**
- Modify: `app/globals.css:1-130`
- Modify: `tailwind.config.ts:70-125`
- Modify: `styles/globals.css:1`
- Modify: `styles/editor-theme.css:1`
- Modify: `audit-artifacts/amendments-2026-07-30/baseline.md`

- [ ] **Step 1: Record the inherited worktree and baseline**

Run:

```powershell
git diff --stat
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run build
```

Expected: typecheck exits `0`; known lint failures are copied verbatim into the baseline; build either exits `0` or its pre-existing failure is recorded with the exact error and exit code.

- [ ] **Step 2: Verify the authoritative tokens**

Ensure `app/globals.css` contains this contract without replacing existing brand colors:

```css
:root {
  --font-display: var(--font-elegist);
  --dur-press: 120ms;
  --dur-hover: 180ms;
  --dur-content: 280ms;
  --ease-hover: cubic-bezier(0.16, 1, 0.3, 1);
  --ease-structural: cubic-bezier(0.22, 1, 0.36, 1);
  --z-rail-collapsed: 30;
  --z-header: 100;
  --z-rail-expanded: 120;
}
```

- [ ] **Step 3: Keep Tailwind as an alias layer**

Map duration, easing, z-index, and display font values to `var(...)` tokens. Do not add new hardcoded hex values or duplicate token ownership in `tailwind.config.ts`.

- [ ] **Step 4: Mark legacy style entry points**

Add a one-line deprecation header to `styles/globals.css` and `styles/editor-theme.css` stating that `app/globals.css` owns new tokens. Do not delete either file.

- [ ] **Step 5: Run focused checks and commit**

```powershell
npm.cmd run typecheck
git diff --check -- app/globals.css tailwind.config.ts styles/globals.css styles/editor-theme.css
git add app/globals.css tailwind.config.ts styles/globals.css styles/editor-theme.css audit-artifacts/amendments-2026-07-30/baseline.md
git commit -m "chore: consolidate MAUL motion tokens"
```

Expected: typecheck passes and `git diff --check` reports no whitespace errors.

### Task 2: Build The Editorial Text Primitive With Tests

**Files:**
- Create: `components/ui/cinematic-text-reveal.tsx`
- Create: `tests/cinematic-text-reveal-regression.test.mjs`
- Modify: `components/editor/PrometheusChat.tsx`
- Modify: `components/editor/prometheus-chat-mobile.tsx`

- [ ] **Step 1: Write the failing regression contract**

Create assertions that require the component to export `segmentGraphemes` and `CinematicTextReveal`, use `Intl.Segmenter`, expose a code-point fallback, call `useReducedMotion`, render a complete accessible label, mark animated glyphs `aria-hidden`, support `measured` and `hard-cut`, default `once` to `true`, and cap delay at `360` ms.

```js
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync("components/ui/cinematic-text-reveal.tsx", "utf8");
assert.match(source, /export function segmentGraphemes/);
assert.match(source, /Intl\.Segmenter/);
assert.match(source, /useReducedMotion/);
assert.match(source, /aria-hidden="true"/);
assert.match(source, /variant.*measured.*hard-cut/s);
assert.match(source, /Math\.min\([^)]*360/);
```

- [ ] **Step 2: Run the test and verify failure**

```powershell
node tests/cinematic-text-reveal-regression.test.mjs
```

Expected: FAIL because `components/ui/cinematic-text-reveal.tsx` does not exist.

- [ ] **Step 3: Implement the isolated component**

Use the following public interface and keep glyph mechanics internal:

```ts
export type CinematicTextRevealProps = {
  children: string
  as?: "h1" | "h2" | "h3" | "p" | "span"
  variant?: "measured" | "hard-cut"
  className?: string
  once?: boolean
}
```

`segmentGraphemes` must prefer `Intl.Segmenter(undefined, { granularity: "grapheme" })` and fall back to `Array.from(value)`. Render one visually-hidden complete string and an `aria-hidden="true"` animated copy. Reduced motion renders the final position with no opacity, blur, clip, or transform transition.

- [ ] **Step 4: Integrate only at focal chat states**

Use `variant="measured"` for the empty-chat heading on desktop and mobile. Do not animate the composer, history rows, project title, streamed message body, or suggestion labels letter by letter.

- [ ] **Step 5: Run focused verification and commit**

```powershell
node tests/cinematic-text-reveal-regression.test.mjs
npm.cmd run typecheck
git add components/ui/cinematic-text-reveal.tsx components/editor/PrometheusChat.tsx components/editor/prometheus-chat-mobile.tsx tests/cinematic-text-reveal-regression.test.mjs
git commit -m "feat: add editorial text choreography"
```

Expected: regression script and typecheck pass.

### Task 3: Close M1-1 Editor Rail Stacking

**Files:**
- Modify: `components/sidebar/AwwwardsSidebar.tsx`
- Modify: `components/editor/EditorRouteShell.tsx`
- Test: `tests/editor-rail-luxury-regression.test.mjs`

- [ ] **Step 1: Strengthen the regression**

Assert that the sidebar reports expansion via `onExpansionChange`, sets `data-expanded`, the route shell applies `--z-rail-expanded` only while expanded, and the header remains at `--z-header`.

- [ ] **Step 2: Run the regression before corrections**

```powershell
node tests/editor-rail-luxury-regression.test.mjs
```

Expected: either PASS, proving the inherited implementation, or FAIL at the missing contract being corrected.

- [ ] **Step 3: Correct the stacking contract surgically**

Keep the sidebar width animation and existing callbacks. Do not add `window.innerWidth` checks. The expanded rail must be above `z-header`; the collapsed rail must remain below it.

- [ ] **Step 4: Run checks and commit**

```powershell
node tests/editor-rail-luxury-regression.test.mjs
npm.cmd run typecheck
git add components/sidebar/AwwwardsSidebar.tsx components/editor/EditorRouteShell.tsx tests/editor-rail-luxury-regression.test.mjs
git commit -m "fix: enforce editor rail stacking contract"
```

### Task 4: Close M1-2 Chat History Loading

**Files:**
- Modify: `lib/supabase/chat-messages.ts`
- Modify: `hooks/use-ai-chat.ts`
- Modify: `components/editor/PrometheusChat.tsx`
- Modify: `components/editor/prometheus-chat-mobile.tsx`
- Test: `tests/chat-history-load-regression.test.mjs`

- [ ] **Step 1: Run the inherited behavioral regression**

```powershell
node tests/chat-history-load-regression.test.mjs
```

Expected: fallback retries exactly once without `client_message_id`; generic errors propagate; desktop and mobile expose Retry.

- [ ] **Step 2: Audit the hook contract**

Confirm `historyLoadError` and `retryLoadSession` are additive return fields, `selectSession` does not clear the current messages before the replacement fetch succeeds, and the error is cleared on successful load or a new selection.

- [ ] **Step 3: Audit metadata hydration**

Map persisted `metadata.frames`, `metadata.toolCalls`, `metadata.actionDrafts`, and `metadata.suggestions` defensively. Unknown keys remain tolerated; no backend path changes.

- [ ] **Step 4: Run focused chat regressions and commit**

```powershell
node tests/chat-history-load-regression.test.mjs
node tests/prometheus-chat-regression.test.mjs
npm.cmd run typecheck
git add lib/supabase/chat-messages.ts hooks/use-ai-chat.ts lib/prometheus-assistant/chat-stream.ts components/editor/PrometheusChat.tsx components/editor/prometheus-chat-mobile.tsx tests/chat-history-load-regression.test.mjs
git commit -m "fix: surface recoverable chat history failures"
```

### Task 5: Close M1-3 Rename Affordance And Propagation

**Files:**
- Modify: `components/editor/EditorHeader.tsx`
- Modify: `app/editor/[id]/page.tsx`
- Read: `components/editor/PreviewCanvas.tsx`
- Test: `tests/editor-polish-regression.test.mjs`

- [ ] **Step 1: Add rename assertions**

Require a pencil icon, tooltip/accessibility label, visible focus state, and the unchanged `onTitleSave`/`onTitleKeyDown` flow. Assert title save updates project title and `sourceAssetLabel` before returning.

- [ ] **Step 2: Run the test before corrections**

```powershell
node tests/editor-polish-regression.test.mjs
```

- [ ] **Step 3: Audit every visible title consumer**

Trace `project.title`, `sourceAssetLabel`, `EditorHeader`, `PreviewCanvas`, motion canvas, and asset surfaces. Keep `PATCH /api/projects/[id]`; do not add another request or rename the R2 object.

- [ ] **Step 4: Run focused checks and commit**

```powershell
node tests/editor-polish-regression.test.mjs
npm.cmd run typecheck
git add components/editor/EditorHeader.tsx app/editor/[id]/page.tsx tests/editor-polish-regression.test.mjs
git commit -m "feat: refine project rename affordance"
```

### Task 6: Close M2-1 Contextual Suggestion Chips

**Files:**
- Modify: `components/editor/ai-chat-suggestions.tsx`
- Modify: `components/editor/PrometheusChat.tsx`
- Modify: `components/editor/prometheus-chat-mobile.tsx`
- Modify: `app/editor/[id]/page.tsx`
- Modify: `hooks/use-ai-chat.ts`
- Modify: `lib/prometheus-assistant/chat-stream.ts`
- Create: `tests/chat-suggestion-chips.test.mjs`

- [ ] **Step 1: Write the deterministic behavior test**

Assert `getChatSuggestionsForWorkspaceTab` returns exactly four strings for Editor, Music, Motion, and unknown/null input. Assert the component slices stream-provided suggestions to four, renders a one-row desktop grid and 2x2 compact grid, uses `min-h-11`, and calls `onSelect` without sending.

- [ ] **Step 2: Run the test and verify the missing coverage**

```powershell
node tests/chat-suggestion-chips.test.mjs
```

Expected: FAIL until the new regression file and any missing contracts are complete.

- [ ] **Step 3: Consolidate the suggestion implementation**

Keep only `ChatSuggestions` and remove dormant quick-action arrays/false branches already authorized by the parent plan. Stream suggestions override deterministic defaults; clicking calls the existing draft setter and focuses the composer where the current API permits.

- [ ] **Step 4: Verify desktop and mobile parity**

Ensure both surfaces pass `workspaceTab`, hide suggestions during generation, and preserve four stable slots without horizontal scrolling or layout shift.

- [ ] **Step 5: Run regressions and commit**

```powershell
node tests/chat-suggestion-chips.test.mjs
node tests/prometheus-chat-regression.test.mjs
npm.cmd run typecheck
git add components/editor/ai-chat-suggestions.tsx components/editor/PrometheusChat.tsx components/editor/prometheus-chat-mobile.tsx app/editor/[id]/page.tsx hooks/use-ai-chat.ts lib/prometheus-assistant/chat-stream.ts tests/chat-suggestion-chips.test.mjs
git commit -m "feat: add contextual chat suggestion chips"
```

### Task 7: Visual Proof And Full First-Slice Verification

**Files:**
- Create: `audit-artifacts/amendments-2026-07-30/m0-foundations/*`
- Create: `audit-artifacts/amendments-2026-07-30/m1-editor/*`
- Create: `audit-artifacts/amendments-2026-07-30/m2-suggestions/*`
- Modify: `audit-artifacts/amendments-2026-07-30/batch1-verify.md`

- [ ] **Step 1: Start the app on an unused port**

```powershell
npm.cmd run dev -- --port 3000
```

If port 3000 is occupied, use 3001 and record the chosen URL.

- [ ] **Step 2: Capture required states**

Capture desktop and mobile screenshots for collapsed/expanded rail, rename hover/focus/edit, chat history failure/retry, four suggestion chips, Measured Reveal final state, and the static reduced-motion state.

- [ ] **Step 3: Check interaction and accessibility**

Keyboard-traverse icon controls and chips; confirm 44 px targets, visible focus, correct accessible names, no clipped focus rings, and no incoherent overlap at 390x844, 768x1024, and 1440x900.

- [ ] **Step 4: Run the complete verification ledger**

```powershell
node tests/cinematic-text-reveal-regression.test.mjs
node tests/chat-history-load-regression.test.mjs
node tests/chat-suggestion-chips.test.mjs
node tests/editor-rail-luxury-regression.test.mjs
node tests/editor-polish-regression.test.mjs
node tests/prometheus-chat-regression.test.mjs
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run build
git diff --check
git diff --stat
```

- [ ] **Step 5: Audit against the spec**

Confirm each acceptance criterion in `docs/superpowers/specs/2026-07-30-maul-2-first-slice-design.md` has direct test, screenshot, build, or diff evidence. Record inherited lint/build failures separately from new failures.

- [ ] **Step 6: Commit verification artifacts**

```powershell
git add audit-artifacts/amendments-2026-07-30
git commit -m "test: verify MAUL first slice"
```

## Plan Self-Review

- Every in-scope milestone from M0 through M2-1 has a discrete task, focused regression, exact command, and commit boundary.
- `CinematicTextReveal` covers both approved variants, grapheme segmentation, screen-reader output, reduced motion, once-only entry, and the 360 ms cap.
- No task changes a backend endpoint, hook contract, brand color, or dependency.
- M2-2 and later redesign milestones remain outside this plan and begin only after this slice passes Task 7.
- The plan contains no unresolved placeholders or delegated implementation details.
