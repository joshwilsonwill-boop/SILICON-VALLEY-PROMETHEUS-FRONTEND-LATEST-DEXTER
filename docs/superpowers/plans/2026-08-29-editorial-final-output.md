# Editorial Chamber Final Output Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Persist each project-scoped Lambda render, reconcile its completion, and make the latest valid final video the default Editorial Chamber preview with an accessible Original/Final selector and completion reveal.

**Architecture:** A Supabase render-receipt table associates the current source asset with its Mini-Run/Lambda job. A same-origin project endpoint owns authorization, upstream reconciliation, and browser-safe output URLs; a client hook polls that endpoint only while work is active. Pure preview-selection logic and a focused result-controls component keep the large editor page limited to media orchestration.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Supabase/Postgres RLS, Framer Motion, Tailwind CSS, Node test runner through `tsx`, Playwright CLI.

## Global Constraints

- `Final` means the latest completed render associated with the project's current source.
- `Original` means the current project source/reference video.
- The original media record is never replaced or mutated by display selection.
- A result is eligible only when its source asset ID matches the project's current source asset.
- A completion is displayable only when it has a usable video URL.
- The browser never receives Mini-Run service credentials.
- The completion reveal lasts about 900-1200 ms; reduced motion crossfades in under 150 ms.
- Do not add render controls, a version browser, comparison scrubbing, historical-output selection, or an untrustworthy determinate progress bar.
- Preserve the existing uncommitted transcript-delivery edits in `app/editor/[id]/page.tsx` and related files.

---

## File Map

- Create `supabase/migrations/20260829000000_project_render_receipts.sql`: durable project/source/job association with owner RLS.
- Create `lib/final-output.ts`: shared types, raw status normalization, safe URL conversion, and pure active-preview selection.
- Create `lib/server/project-render-receipts.ts`: receipt insert/read/update operations using the authenticated Supabase client.
- Create `app/api/projects/[id]/final-output/route.ts`: owned receipt lookup and non-terminal upstream reconciliation.
- Create `hooks/use-project-final-output.ts`: bounded client polling and stable terminal state.
- Create `components/editor/final-output-controls.tsx`: skeletal render status, reveal shell, failure state, and Original/Final segmented control.
- Modify `app/api/projects/[id]/assets/route.ts`: persist automatic dispatch receipts.
- Modify `app/api/mini-run/dispatch/route.ts`: persist user-triggered dispatch receipts.
- Modify `lib/server/mini-run-proxy.ts`: allow safe same-origin output-media reads.
- Modify `components/editor/PreviewCanvas.tsx`: render final-output controls without owning lifecycle state.
- Modify `app/editor/[id]/page.tsx`: preload completed media, promote once, switch active media, and share behavior with mobile.
- Create `tests/final-output-domain.test.ts`: status, URL, source eligibility, and preview-selection behavior.
- Create `tests/final-output-persistence.test.mjs`: migration, receipt-service, and dispatch-route contracts.
- Create `tests/final-output-route.test.ts`: reconciliation behavior with injected fetch/status inputs.
- Create `tests/final-output-hook-regression.test.mjs`: hook polling and cleanup contract.
- Create `tests/editor-final-output-ui.test.tsx`: result-control markup, status, selection, and reduced-motion contract.
- Create `tests/editor-final-output-integration.test.mjs`: editor/PreviewCanvas/mobile wiring regression contract.

### Task 1: Final Output Domain Contract

**Files:**
- Create: `lib/final-output.ts`
- Create: `tests/final-output-domain.test.ts`

**Interfaces:**
- Produces: `FinalOutputLifecycle`, `FinalOutputView`, `ProjectFinalOutput`, `normalizeFinalOutputSnapshot(raw, receipt)`, `browserFinalOutputUrl(rawUrl)`, `isFinalOutputEligible(output, sourceAssetId)`, and `resolveActivePreview(input)`.
- Consumes: no application state or network clients.

- [ ] **Step 1: Write the failing domain tests**

```ts
import assert from 'node:assert/strict'
import test from 'node:test'

import {
  browserFinalOutputUrl,
  isFinalOutputEligible,
  normalizeFinalOutputSnapshot,
  resolveActivePreview,
} from '../lib/final-output'

const receipt = {
  id: 'receipt-1', projectId: 'project-1', sourceAssetId: 'source-1',
  jobId: 'job-1', pipelineJobId: 'pipeline-1', status: 'processing' as const,
  outputUrl: null, r2Key: null, errorMessage: null,
  createdAt: '2026-08-29T00:00:00.000Z', updatedAt: '2026-08-29T00:00:00.000Z',
}

test('normalizes a completed Mini-Run envelope with an output URL', () => {
  const result = normalizeFinalOutputSnapshot({
    state: 'completed',
    returnvalue: { outputUrl: 'https://cdn.example/final.mp4', r2Key: 'renders/final.mp4' },
  }, receipt)
  assert.equal(result.status, 'completed')
  assert.equal(result.outputUrl, 'https://cdn.example/final.mp4')
})

test('completed without an output is a failed display result', () => {
  const result = normalizeFinalOutputSnapshot({ state: 'completed' }, receipt)
  assert.equal(result.status, 'failed')
  assert.match(result.errorMessage ?? '', /output/i)
})

test('maps backend media to the same-origin Mini-Run proxy', () => {
  assert.equal(browserFinalOutputUrl('/media/final.mp4'), '/api/mini-run/media/final.mp4')
})

test('rejects an output from a replaced source', () => {
  const output = { ...receipt, status: 'completed' as const, outputUrl: 'https://cdn.example/final.mp4' }
  assert.equal(isFinalOutputEligible(output, 'source-2'), false)
})

test('uses final only when selected and playable', () => {
  const original = { url: 'blob:original', kind: 'video' as const }
  const final = { url: 'https://cdn.example/final.mp4', kind: 'video' as const }
  assert.deepEqual(resolveActivePreview({ view: 'final', original, final, finalPlayable: true }), final)
  assert.deepEqual(resolveActivePreview({ view: 'final', original, final, finalPlayable: false }), original)
})
```

- [ ] **Step 2: Run the test and verify RED**

Run: `npx tsx --test tests/final-output-domain.test.ts`

Expected: FAIL because `lib/final-output.ts` does not exist.

- [ ] **Step 3: Implement the pure domain module**

```ts
export type FinalOutputLifecycle = 'idle' | 'queued' | 'processing' | 'completed' | 'failed'
export type FinalOutputView = 'original' | 'final'

export interface ProjectFinalOutput {
  id: string
  projectId: string
  sourceAssetId: string
  jobId: string
  pipelineJobId: string | null
  status: Exclude<FinalOutputLifecycle, 'idle'>
  outputUrl: string | null
  r2Key: string | null
  errorMessage: string | null
  createdAt: string
  updatedAt: string
}

export function browserFinalOutputUrl(rawUrl: string | null | undefined): string | null {
  const value = rawUrl?.trim()
  if (!value) return null
  if (value.startsWith('/media/')) return `/api/mini-run${value}`
  if (value.startsWith('/api/mini-run/media/')) return value
  try {
    const parsed = new URL(value)
    return parsed.protocol === 'https:' || (process.env.NODE_ENV !== 'production' && parsed.protocol === 'http:')
      ? parsed.toString()
      : null
  } catch {
    return null
  }
}
```

Implement `normalizeFinalOutputSnapshot` by reading both top-level and `returnvalue`/`response` fields, accepting completed/success/finished and failed/error terminal aliases, and converting a completed snapshot without `browserFinalOutputUrl(...)` into `failed` with `Completed render did not provide a playable output.` Implement `resolveActivePreview` as the pure fallback shown by the tests.

- [ ] **Step 4: Run the domain tests and verify GREEN**

Run: `npx tsx --test tests/final-output-domain.test.ts`

Expected: 5 tests pass with zero failures.

- [ ] **Step 5: Commit the domain contract**

```bash
git add lib/final-output.ts tests/final-output-domain.test.ts
git commit -m "feat: define final output preview contract"
```

### Task 2: Durable Project Render Receipts

**Files:**
- Create: `supabase/migrations/20260829000000_project_render_receipts.sql`
- Create: `lib/server/project-render-receipts.ts`
- Create: `tests/final-output-persistence.test.mjs`

**Interfaces:**
- Consumes: `ProjectFinalOutput` from Task 1 and a Supabase client already authenticated by the route.
- Produces: `recordProjectRenderDispatch(client, input)`, `getLatestEligibleRenderReceipt(client, input)`, and `updateProjectRenderReceipt(client, id, patch)`.

- [ ] **Step 1: Write the failing persistence contract test**

```js
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const read = (path) => readFileSync(path, 'utf8')

test('migration scopes render receipts to project owners and source assets', () => {
  const sql = read('supabase/migrations/20260829000000_project_render_receipts.sql')
  assert.match(sql, /create table if not exists public\.project_render_receipts/)
  assert.match(sql, /source_asset_id uuid references public\.source_assets/)
  assert.match(sql, /unique \(project_id, source_asset_id, job_id\)/)
  assert.match(sql, /enable row level security/)
  assert.match(sql, /auth\.uid\(\) = user_id/)
})

test('receipt service always filters by user and current source', () => {
  const source = read('lib/server/project-render-receipts.ts')
  assert.match(source, /\.eq\('user_id', input\.userId\)/)
  assert.match(source, /\.eq\('source_asset_id', input\.sourceAssetId\)/)
  assert.match(source, /\.order\('created_at', \{ ascending: false \}\)/)
})
```

- [ ] **Step 2: Run the test and verify RED**

Run: `node --test tests/final-output-persistence.test.mjs`

Expected: FAIL because the migration and receipt service do not exist.

- [ ] **Step 3: Add the migration**

```sql
create table if not exists public.project_render_receipts (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  source_asset_id uuid not null references public.source_assets(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  job_id text not null,
  pipeline_job_id text,
  status text not null default 'queued'
    check (status in ('queued', 'processing', 'completed', 'failed')),
  output_url text,
  r2_key text,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, source_asset_id, job_id)
);
```

Add indexes on `(project_id, source_asset_id, created_at desc)` and `job_id`; enable RLS; add owner select/insert/update/delete policies; attach `public.handle_updated_at()` using a guarded trigger recreation.

- [ ] **Step 4: Implement the receipt service**

Map snake-case database rows into `ProjectFinalOutput`. Insert dispatches with `upsert(..., { onConflict: 'project_id,source_asset_id,job_id' })`. Every read/update includes `user_id`; latest reads also include `project_id` and `source_asset_id` and use `maybeSingle()` after ordering/limiting.

- [ ] **Step 5: Run the persistence test and verify GREEN**

Run: `node --test tests/final-output-persistence.test.mjs`

Expected: 2 tests pass with zero failures.

- [ ] **Step 6: Commit the durable receipt slice**

```bash
git add supabase/migrations/20260829000000_project_render_receipts.sql lib/server/project-render-receipts.ts tests/final-output-persistence.test.mjs
git commit -m "feat: persist project render receipts"
```

### Task 3: Capture Automatic and Manual Dispatches

**Files:**
- Modify: `app/api/projects/[id]/assets/route.ts`
- Modify: `app/api/mini-run/dispatch/route.ts`
- Modify: `tests/final-output-persistence.test.mjs`

**Interfaces:**
- Consumes: `recordProjectRenderDispatch` from Task 2 and existing `miniRunDispatch` responses.
- Produces: a receipt for every successful automatic or user-triggered render dispatch.

- [ ] **Step 1: Extend the failing dispatch contract test**

```js
test('both dispatch routes persist project render receipts', () => {
  for (const path of ['app/api/projects/[id]/assets/route.ts', 'app/api/mini-run/dispatch/route.ts']) {
    const source = read(path)
    assert.match(source, /recordProjectRenderDispatch/)
    assert.match(source, /sourceAssetId:/)
    assert.match(source, /jobId:/)
  }
})
```

- [ ] **Step 2: Run the contract test and verify RED**

Run: `node --test tests/final-output-persistence.test.mjs`

Expected: the new test fails because neither route records a receipt.

- [ ] **Step 3: Persist the automatic upload dispatch**

Immediately after `dispatchMiniRunRender` succeeds in the asset commit route, call:

```ts
await recordProjectRenderDispatch(supabase, {
  projectId,
  sourceAssetId: committedAsset.id!,
  userId: user.id,
  jobId: miniRunDispatch.jobId,
  pipelineJobId: miniRunDispatch.pipelineJobId || null,
  status: miniRunDispatch.status,
})
```

If persistence fails, log the failure and return `miniRunDispatch: null` so the client is not told a non-recoverable render is tracked. Do not roll back the already committed source.

- [ ] **Step 4: Persist the manual dispatch**

After the upstream manual dispatch succeeds, record the same fields using the owned `sourceAssetId` and authenticated user. If the receipt insert fails, return HTTP 502 with code `RENDER_RECEIPT_FAILED`; do not expose service credentials or the upstream payload.

- [ ] **Step 5: Run the persistence contract and verify GREEN**

Run: `node --test tests/final-output-persistence.test.mjs`

Expected: 3 tests pass with zero failures.

- [ ] **Step 6: Commit dispatch capture**

```bash
git add app/api/projects/[id]/assets/route.ts app/api/mini-run/dispatch/route.ts tests/final-output-persistence.test.mjs
git commit -m "feat: associate render dispatches with projects"
```

### Task 4: Owned Final Output Reconciliation Endpoint

**Files:**
- Modify: `lib/server/mini-run-proxy.ts`
- Create: `app/api/projects/[id]/final-output/route.ts`
- Create: `tests/final-output-route.test.ts`

**Interfaces:**
- Consumes: Task 1 normalization, Task 2 receipt service, `resolveMiniRunConfig`, and project ownership from Supabase.
- Produces: `GET /api/projects/:id/final-output` returning `{ finalOutput: ProjectFinalOutput | null }`.

- [ ] **Step 1: Write failing reconciliation tests**

```ts
import assert from 'node:assert/strict'
import test from 'node:test'
import { reconcileProjectFinalOutput } from '../lib/final-output'

test('does not fetch upstream for a completed receipt', async () => {
  let calls = 0
  const result = await reconcileProjectFinalOutput(completedReceipt, async () => { calls += 1; return {} })
  assert.equal(calls, 0)
  assert.equal(result.status, 'completed')
})

test('reconciles a processing receipt into completed output', async () => {
  const result = await reconcileProjectFinalOutput(processingReceipt, async () => ({
    state: 'finished', response: { outputUrl: '/media/final.mp4' },
  }))
  assert.equal(result.status, 'completed')
  assert.equal(result.outputUrl, '/api/mini-run/media/final.mp4')
})
```

Define `completedReceipt` and `processingReceipt` in the test with the exact `ProjectFinalOutput` shape from Task 1. Add tests for failed upstream state and thrown network errors preserving `processing` plus a retryable route error.

- [ ] **Step 2: Run the route-domain tests and verify RED**

Run: `npx tsx --test tests/final-output-route.test.ts`

Expected: FAIL because `reconcileProjectFinalOutput` is not exported.

- [ ] **Step 3: Add the injectable reconciler**

Add to `lib/final-output.ts`:

```ts
export async function reconcileProjectFinalOutput(
  receipt: ProjectFinalOutput,
  loadStatus: (jobId: string) => Promise<unknown>,
) {
  if (receipt.status === 'completed' || receipt.status === 'failed') return receipt
  return normalizeFinalOutputSnapshot(await loadStatus(receipt.jobId), receipt)
}
```

Do not convert a thrown request into `failed`; let the route return a transient error while retaining the persisted non-terminal receipt.

- [ ] **Step 4: Implement the owned route**

The route must:

1. authenticate with `supabase.auth.getUser()`;
2. read the project with `.eq('id', projectId).eq('user_id', user.id)`;
3. return `{ finalOutput: null }` if there is no current source or receipt;
4. load the latest receipt matching that exact source;
5. for queued/processing, call `${config.baseUrl}/api/pipeline/job/${encodeURIComponent(jobId)}` with `Modal-Key`, `Modal-Secret`, and `cache: 'no-store'`;
6. normalize and persist changed status/output/error fields;
7. return the mapped receipt with `Cache-Control: no-store`.

Use 401 for no user, 404 for an unknown project, 502 for upstream reconciliation failure, and 500 for persistence failures.

- [ ] **Step 5: Allow browser-safe media proxy reads**

Extend `isAllowedMiniRunRequest` to accept only `GET media/<safe path segments>`. Keep dot-segment rejection. The final-output normalizer maps only `/media/...` outputs to `/api/mini-run/media/...`; arbitrary relative paths remain invalid.

- [ ] **Step 6: Run route and proxy tests and verify GREEN**

Run: `npx tsx --test tests/final-output-route.test.ts tests/mini-run-proxy.test.ts`

If the existing proxy test filename differs, locate it with `rg -l "isAllowedMiniRunRequest" tests` and run that exact file alongside `tests/final-output-route.test.ts`.

Expected: all selected tests pass.

- [ ] **Step 7: Commit the final-output endpoint**

```bash
git add lib/final-output.ts lib/server/mini-run-proxy.ts app/api/projects/[id]/final-output/route.ts tests/final-output-route.test.ts tests
git commit -m "feat: reconcile project final outputs"
```

### Task 5: Bounded Final Output Polling Hook

**Files:**
- Create: `hooks/use-project-final-output.ts`
- Create: `tests/final-output-hook-regression.test.mjs`

**Interfaces:**
- Consumes: `GET /api/projects/:id/final-output` from Task 4.
- Produces: `useProjectFinalOutput({ projectId, sourceAssetId })` returning `{ finalOutput, lifecycle, error, isPolling, refresh }`.

- [ ] **Step 1: Write the failing hook contract test**

```js
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

test('polls only non-terminal final outputs and cleans up timers', () => {
  const source = readFileSync('hooks/use-project-final-output.ts', 'utf8')
  assert.match(source, /\/api\/projects\/\$\{projectId\}\/final-output/)
  assert.match(source, /status === 'queued' \|\| .*status === 'processing'/s)
  assert.match(source, /window\.setTimeout/)
  assert.match(source, /window\.clearTimeout/)
  assert.match(source, /AbortController/)
  assert.match(source, /sourceAssetId/)
})
```

- [ ] **Step 2: Run the hook contract and verify RED**

Run: `node --test tests/final-output-hook-regression.test.mjs`

Expected: FAIL because the hook does not exist.

- [ ] **Step 3: Implement bounded polling**

Use a 2500 ms normal interval, increase transient-error retries to at most 15000 ms, and stop after 300 attempts. Abort the active request and clear the timer on source change or unmount. Reset state when `sourceAssetId` becomes null. Never clear a completed `finalOutput` because a later refresh has a transient network error.

The hook response shape is:

```ts
export interface UseProjectFinalOutputResult {
  finalOutput: ProjectFinalOutput | null
  lifecycle: FinalOutputLifecycle
  error: string | null
  isPolling: boolean
  refresh: () => void
}
```

- [ ] **Step 4: Run the hook contract and verify GREEN**

Run: `node --test tests/final-output-hook-regression.test.mjs`

Expected: 1 test passes.

- [ ] **Step 5: Commit the polling hook**

```bash
git add hooks/use-project-final-output.ts tests/final-output-hook-regression.test.mjs
git commit -m "feat: poll project final output state"
```

### Task 6: Result Controls and Completion Motion

**Files:**
- Create: `components/editor/final-output-controls.tsx`
- Create: `tests/editor-final-output-ui.test.tsx`

**Interfaces:**
- Consumes: `FinalOutputLifecycle`, `FinalOutputView`, render ID, failure text, and selection callback.
- Produces: `FinalOutputControls` with processing, failed, ready, selected, reveal, keyboard, and reduced-motion states.

- [ ] **Step 1: Write failing component tests**

```tsx
import assert from 'node:assert/strict'
import test from 'node:test'
import { renderToStaticMarkup } from 'react-dom/server'
import { FinalOutputControls } from '../components/editor/final-output-controls'

test('shows rendering status without exposing the selector early', () => {
  const html = renderToStaticMarkup(
    <FinalOutputControls lifecycle="processing" view="original" hasFinal={false}
      revealId={null} error={null} onSelect={() => undefined} />,
  )
  assert.match(html, /Rendering final/)
  assert.doesNotMatch(html, /role="tablist"/)
})

test('renders an accessible Original and Final selector', () => {
  const html = renderToStaticMarkup(
    <FinalOutputControls lifecycle="completed" view="final" hasFinal
      revealId="receipt-1" error={null} onSelect={() => undefined} />,
  )
  assert.match(html, /role="tablist"/)
  assert.match(html, /aria-selected="true"/)
  assert.match(html, />Original</)
  assert.match(html, />Final</)
})
```

- [ ] **Step 2: Run the component tests and verify RED**

Run: `npx tsx --test tests/editor-final-output-ui.test.tsx`

Expected: FAIL because the component does not exist.

- [ ] **Step 3: Implement the focused control component**

Use `useReducedMotion`, `AnimatePresence`, `motion.div`, `Check`, `Film`, and `AlertCircle`. Render:

- `data-final-output-state="processing"` with an absolute, pointer-events-none edge trace and compact inline loader;
- a concise failed badge with `role="status"` and no Final tab;
- a `role="tablist" aria-label="Preview source"` with two buttons using `role="tab"` and `aria-selected`;
- a layout indicator keyed by `editor-final-output-active-view`;
- an `aria-hidden` reveal overlay keyed by `revealId`, using a 0.95 second sweep normally and a 0.12 second opacity transition for reduced motion.

Keep the control at 36 px height, at most 180 px wide, 8 px or smaller corner radius, zero letter spacing, and stable dimensions in every state.

- [ ] **Step 4: Run the component tests and verify GREEN**

Run: `npx tsx --test tests/editor-final-output-ui.test.tsx`

Expected: 2 tests pass with zero failures.

- [ ] **Step 5: Commit result controls**

```bash
git add components/editor/final-output-controls.tsx tests/editor-final-output-ui.test.tsx
git commit -m "feat: add final output preview controls"
```

### Task 7: Editorial Chamber and Mobile Integration

**Files:**
- Modify: `components/editor/PreviewCanvas.tsx`
- Modify: `app/editor/[id]/page.tsx`
- Create: `tests/editor-final-output-integration.test.mjs`

**Interfaces:**
- Consumes: Tasks 1, 5, and 6.
- Produces: automatic playable Final promotion, stable user selection, active-video transport, desktop reveal, and compact mobile selection.

- [ ] **Step 1: Write the failing integration contract**

```js
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

test('editor resolves original and final media separately', () => {
  const source = readFileSync('app/editor/[id]/page.tsx', 'utf8')
  assert.match(source, /useProjectFinalOutput/)
  assert.match(source, /originalPreviewUrl/)
  assert.match(source, /playableFinalUrl/)
  assert.match(source, /resolveActivePreview/)
  assert.match(source, /finalOutputView/)
})

test('desktop and mobile render the final output controls', () => {
  const page = readFileSync('app/editor/[id]/page.tsx', 'utf8')
  const canvas = readFileSync('components/editor/PreviewCanvas.tsx', 'utf8')
  assert.match(canvas, /<FinalOutputControls/)
  assert.match(page, /finalOutputLifecycle=/)
  assert.match(page, /onFinalOutputViewChange=/)
})
```

- [ ] **Step 2: Run the integration contract and verify RED**

Run: `node --test tests/editor-final-output-integration.test.mjs`

Expected: both tests fail because the editor has no final-output state.

- [ ] **Step 3: Add playable final-media orchestration**

In `OriginalEditorPage`:

```ts
const { finalOutput, lifecycle: finalOutputLifecycle, error: finalOutputError } =
  useProjectFinalOutput({ projectId, sourceAssetId: project?.sourceAssetId ?? null })
const [finalOutputView, setFinalOutputView] = React.useState<FinalOutputView>('original')
const [playableFinalUrl, setPlayableFinalUrl] = React.useState<string | null>(null)
const [finalRevealId, setFinalRevealId] = React.useState<string | null>(null)
```

Rename the source-stage result used for comparison to `originalPreviewUrl`. When an eligible completed output changes, preload it with an unattached muted `<video preload="auto">`; accept it on `loadeddata`/`canplay`, then set `playableFinalUrl`, select `final`, reset time/play state, and set `finalRevealId` only when the receipt ID differs from `lastPromotedFinalIdRef.current`. Clean up event handlers and `src` on effect cancellation. On preload error, retain Original and expose the error treatment.

Reset view, playable URL, reveal ID, and last promoted ID whenever the current source asset changes. Do not run promotion effects on ordinary rerenders.

- [ ] **Step 4: Resolve and transport the active preview**

Build `originalMedia` from the source-stage URL/kind and `finalMedia` from `playableFinalUrl`. Call `resolveActivePreview`; derive `previewUrl`, `previewKind`, `hasPreviewMedia`, timeline URL, duration, seek, mute, fit, and playback from that active descriptor. Final selection falls back to Original until preloading succeeds.

On manual Original/Final selection, pause the current player, reset `previewCurrentTimeSec` and `previewDurationSec`, set `isPreviewMediaReady(false)`, and update `finalOutputView`. Do not mutate `project.thumbnailUrl`, source-stage state, or source asset records.

- [ ] **Step 5: Wire desktop controls into PreviewCanvas**

Add these props:

```ts
finalOutputLifecycle: FinalOutputLifecycle
finalOutputView: FinalOutputView
hasFinalOutput: boolean
finalOutputRevealId: string | null
finalOutputError: string | null
onFinalOutputViewChange: (view: FinalOutputView) => void
```

Render `FinalOutputControls` inside the fixed preview frame above media but below the transport overlay. Change the source label to `Final output` when Final is active. Ensure the reveal is clipped to the media frame and does not change `aspectRatio`, width, or height.

- [ ] **Step 6: Wire the same selector into mobile**

Add the six props above to `MobileEditorView`. Render `FinalOutputControls` inside the existing mobile `aspect-video` preview container. Keep it clear of the native `MobileVideoPlayer` controls and safe areas; the component's 36 px stable height must fit at the upper center.

- [ ] **Step 7: Run integration and existing editor regression tests**

Run:

```bash
node --test tests/editor-final-output-integration.test.mjs
node --test tests/editor-preview-chat-loader-regression.test.mjs
node --test tests/editorial-chamber-black-shell-regression.test.mjs
node --test tests/editor-reference-regression.test.mjs
npx tsx --test tests/mobile-video-player.test.ts
```

Expected: all selected tests pass.

- [ ] **Step 8: Commit editor integration**

```bash
git add components/editor/PreviewCanvas.tsx app/editor/[id]/page.tsx tests/editor-final-output-integration.test.mjs
git commit -m "feat: display final renders in editorial chamber"
```

### Task 8: Full Verification and Browser Evidence

**Files:**
- Modify only files required to correct verification failures.
- Create screenshots under `output/playwright/` (not committed unless the repository already tracks that directory).

**Interfaces:**
- Consumes: the complete feature.
- Produces: fresh automated, build, and visual evidence for every success criterion.

- [ ] **Step 1: Run all final-output tests together**

```bash
npx tsx --test tests/final-output-domain.test.ts tests/final-output-route.test.ts tests/editor-final-output-ui.test.tsx
node --test tests/final-output-persistence.test.mjs tests/final-output-hook-regression.test.mjs tests/editor-final-output-integration.test.mjs
```

Expected: zero failures.

- [ ] **Step 2: Run repository checks**

```bash
npm run typecheck
npm run lint
npm run build
```

Expected: all commands exit 0. If the repository contains pre-existing failures unrelated to this slice, record exact output and separately verify no new failure points at changed files.

- [ ] **Step 3: Start the application**

Run `npm run dev -- --hostname 0.0.0.0`, using the first free port beginning at 3000. Keep the process running through browser verification and report the chosen URL.

- [ ] **Step 4: Verify desktop with Playwright CLI**

Confirm `npx` is available, set `PWCLI=/home/ec2-user/.codex/skills/playwright/scripts/playwright_cli.sh`, open an owned `/editor/:projectId` route at 1440x900, and take a fresh snapshot before interaction. Use a scoped route mock or controlled development receipt to exercise these exact responses from `/api/projects/:id/final-output`:

1. processing receipt with no output;
2. completed receipt with a playable MP4;
3. failed receipt with a concise error;
4. completed receipt after page reload.

For completion, verify Final becomes selected only after media is playable, switch to Original and back using current snapshot refs, and save screenshots to `output/playwright/editor-final-processing.png`, `editor-final-ready.png`, and `editor-final-original.png`.

- [ ] **Step 5: Verify mobile and reduced motion**

Repeat at 390x844 with reduced motion enabled. Verify the selector fits inside the video stage, both tabs are keyboard reachable, the transition is a short crossfade, native/mobile transport remains usable, and no header, preview, selector, chat, or continuation banner overlaps. Save `output/playwright/editor-final-mobile.png`.

- [ ] **Step 6: Inspect evidence and browser console**

Open each screenshot and visually confirm a nonblank video frame, stable preview bounds, legible selector, and no overlap. Inspect console output after each state and require no React errors, media source loops, hydration warnings, or repeated polling after terminal status.

- [ ] **Step 7: Review the final diff against the spec**

```bash
git diff --check HEAD~1..HEAD
git status --short
git diff --stat 38e301b..HEAD
```

Confirm every success criterion in `docs/superpowers/specs/2026-08-29-editorial-final-output-design.md` has test or browser evidence and that unrelated user changes remain intact.

- [ ] **Step 8: Commit verification corrections if needed**

```bash
git add <only files changed to fix verification failures>
git commit -m "fix: harden final output preview flow"
```
