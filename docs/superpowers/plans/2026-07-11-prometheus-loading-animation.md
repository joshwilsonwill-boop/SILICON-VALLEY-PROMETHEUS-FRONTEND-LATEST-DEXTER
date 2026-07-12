# Prometheus Loading Animation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace every frontend loading indicator with the specified 3.5-second Canvas 2D Prometheus ring animation in full-screen and transparent inline forms.

**Architecture:** A deterministic `AnimationController` maps an absolute requestAnimationFrame timestamp to the exact six-phase state. `RingRenderer` draws cached ring, glow, dot, blob, and reflection textures into a DPR-aware Canvas 2D surface. Two React wrappers share one lifecycle implementation, while a global provider and fetch helper expose app-level loading state.

**Tech Stack:** React 19, Next.js 16, TypeScript, Canvas 2D, requestAnimationFrame, Node test runner through `tsx`, Playwright.

---

### Task 1: Deterministic Animation State

**Files:**
- Create: `components/loading-animation/types.ts`
- Create: `components/loading-animation/AnimationController.ts`
- Create: `components/loading-animation/__tests__/AnimationController.test.ts`

- [ ] Write tests that import the not-yet-created controller and assert the exact `3500ms` duration, phase boundaries (`830`, `1170`, `2170`, `2330`, `3170`), phase-local progress, clockwise rotation, `0 -> 45 -> 90 -> 0` tilt, `0.18 -> 0.02 -> 0.18` radius, half-second ease-in fade, rebuild easing, dot overshoot, and matching states across the loop boundary.
- [ ] Run `npx tsx --test components/loading-animation/__tests__/AnimationController.test.ts`; expect failure because the production modules do not exist.
- [ ] Add the public state/renderer parameter types and implement cubic-bezier easing plus a timestamp-derived controller with no frame-dependent mutation.
- [ ] Re-run the focused test; expect all assertions to pass.

### Task 2: Canvas Renderer And Cached Glow

**Files:**
- Create: `components/loading-animation/shaders/GlowBlur.ts`
- Create: `components/loading-animation/RingRenderer.ts`
- Create: `components/loading-animation/__tests__/RingRenderer.test.ts`

- [ ] Write tests for full-screen and inline relative geometry, exact palette constants, inline transparency, full-screen black clearing, 72 cached ring segments, and DPR-independent logical sizing.
- [ ] Run `npx tsx --test components/loading-animation/__tests__/RingRenderer.test.ts`; expect failure because the renderer does not exist.
- [ ] Implement cached offscreen ring/glow/dot/blob textures, projected Y scaling via `cos(tilt)`, clockwise texture rotation, morphing teardrop geometry, and a vertically flipped `0.15` opacity reflection with a linear fade mask.
- [ ] Re-run both focused test files; expect all assertions to pass.

### Task 3: React Lifecycle And Variants

**Files:**
- Create: `components/loading-animation/LoadingAnimation.tsx`
- Create: `components/loading-animation/InlineLoadingAnimation.tsx`
- Create: `components/loading-animation/index.ts`
- Create: `components/loading-animation/__tests__/loader-contract.test.ts`

- [ ] Write source-contract tests for Canvas-only rendering, `requestAnimationFrame`, capped DPR, `ResizeObserver`, visibility pause/resume, cleanup, pure-black full-screen background, transparent inline background, status semantics, and no SVG/WebGL/Three.js/CSS animation.
- [ ] Run `npx tsx --test components/loading-animation/__tests__/loader-contract.test.ts`; expect failure because the wrappers do not exist.
- [ ] Implement one shared Canvas lifecycle inside the full-screen module and expose the two specified wrapper APIs.
- [ ] Re-run all loading-animation tests; expect all assertions to pass.

### Task 4: Global Loading API

**Files:**
- Create: `contexts/LoadingContext.tsx`
- Create: `hooks/useLoadingFetch.ts`
- Modify: `app/layout.tsx`
- Test: `components/loading-animation/__tests__/loader-contract.test.ts`

- [ ] Extend the contract test to require `LoadingProvider` at the root, a guarded `useLoading` hook, cancellable loading, and `try/finally` cleanup in `useLoadingFetch`; run it and expect the new assertions to fail.
- [ ] Implement the provider/hook and wrap the existing provider tree without changing auth, analytics, or layout ordering.
- [ ] Re-run the contract and typecheck commands; expect both to pass.

### Task 5: Primary Route, Auth, Data, AI, And Video Loaders

**Files:**
- Modify: `app/editor/loading.tsx`
- Modify: `app/editor/[id]/loading.tsx`
- Modify: `app/editor/[id]/page.tsx`
- Modify: `app/editor/components/mobile-video-player.tsx`
- Modify: `app/(auth)/login/page.tsx`
- Modify: `app/(auth)/signup/page.tsx`
- Modify: `app/(auth)/forgot-password/page.tsx`
- Modify: `app/(auth)/verify/page.tsx`
- Modify: `components/auth/AuthShell.tsx`
- Modify: `app/settings/billing/page.tsx`
- Modify: `app/settings/billing/success/page.tsx`
- Modify: `app/settings/social-accounts/page.tsx`
- Modify: `components/dashboard/DashboardRotator.tsx`
- Modify: `components/editor/editor-loading-screen.tsx`
- Modify: `components/video-upload-interface.tsx`
- Modify: `components/editor/editor-new-project-upload-dialog.tsx`
- Modify: `components/editor/music-tab-panel.tsx`
- Modify: `components/editor/cinematic-template-host.tsx`
- Modify: `components/editor/chat-workspace-panel.tsx`
- Modify: `tests/editor-preview-chat-loader-regression.test.mjs`
- Modify: `tests/editor-polish-regression.test.mjs`
- Modify: `tests/editorial-chat-expansion-regression.test.mjs`
- Modify: `tests/prometheus-chat-regression.test.mjs`

- [ ] Change regression assertions first to require the Canvas loader imports/uses and reject the legacy loader names; run the four tests and expect failure against current production code.
- [ ] Swap route and modal loaders to `LoadingAnimation` or `InlineLoadingAnimation`, including the mobile video buffering overlay and editor source-stage loading state.
- [ ] Replace AI response/vapour indicators with the inline Canvas variant while retaining accessible response text.
- [ ] Re-run the four regression tests and typecheck; expect them to pass.

### Task 6: Remaining Spinner And Skeleton Surfaces

**Files:**
- Modify all runtime files returned by `rg -l 'animate-spin|MinimalTypographicLoader|AiResponseLoader|<Skeleton' app components`.
- Modify loading-only pulse, dots, and bar sites identified in the read-only inventory, while retaining media timelines and non-loading determinate controls.
- Delete: `components/ui/minimal-typographic-loader.tsx`
- Delete: `components/ui/ai-response-loader.tsx`
- Delete: `components/ui/skeleton.tsx`
- Delete: `public/loaders/prometheus-infinity-loader.gif`
- Modify: `app/globals.css`
- Test: `components/loading-animation/__tests__/loader-audit.test.ts`

- [ ] Write a repository audit test that walks `app`, `components`, and loader assets, rejects legacy loader imports/components, `animate-spin`, loading skeletons, loading dots/bars, and the old loader CSS selectors/keyframes; run it and expect a complete actionable failure list.
- [ ] Replace compact action states with a stable-size `InlineLoadingAnimation`, page/panel states with the appropriate larger variant, and determinate loading bars with the Canvas loader plus existing percentage/status text.
- [ ] Remove orphaned legacy components, CSS, and GIF after all consumers have migrated.
- [ ] Re-run the audit until it passes, then run all existing `tests/*loader*.test.mjs` tests and typecheck.

### Task 7: Runtime And Visual Verification

**Files:**
- Create only if needed: `tests/loading-animation-visual.spec.ts`

- [ ] Run `npx tsx --test components/loading-animation/__tests__/*.test.ts` and all relevant existing regression tests; require zero failures.
- [ ] Run `npm run typecheck`; require exit code `0`.
- [ ] Run `npm run lint` and compare with the recorded baseline of `6 errors, 28 warnings`; require no new issue in changed files.
- [ ] Run `npm run build`; distinguish loader regressions from the recorded missing-Supabase prerender failure.
- [ ] Start the Next.js dev server and use Playwright at desktop and mobile sizes to capture full-screen and inline loaders at all phase timestamps.
- [ ] Verify canvas pixels are nonblank during visible phases, black for full-screen, transparent around inline content, correctly framed, and non-overlapping.
- [ ] Verify `visibilitychange`, resize, DPR cap, unmount cleanup, and the `3500ms` seamless boundary in the browser.
- [ ] Run `git diff --check`, inspect the complete diff, and confirm no unrelated dirty files or secrets were altered.

