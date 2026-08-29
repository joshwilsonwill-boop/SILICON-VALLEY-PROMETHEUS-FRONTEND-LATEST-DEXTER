# Durable Transcript Delivery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make every completed AssemblyAI transcript reach the Motion workspace through the repository's actual durable-job data contract.

**Architecture:** Upload dispatch persists the provider job and returns. Authenticated editor polling finalizes completed work through a shared persistence-patch builder that writes transcript data into `durable_jobs.result_metadata` and preserves existing JSON metadata. The polling response updates editor state immediately.

**Tech Stack:** Next.js 16 route handlers, React 19, TypeScript, Supabase/Postgres JSONB, AssemblyAI, Node test runner through `tsx`.

## Global Constraints

- Do not add AWS Lambda or Modal as a transcript completion dependency.
- Preserve existing `durable_jobs.result_metadata.artifacts` keys and `projects.source_profile` fields.
- Treat R2 archival as best-effort but surface required database write failures.
- Write failing regression tests before production changes.

---

### Task 1: Transcript Persistence Contract

**Files:**
- Create: `lib/server/transcript-persistence.ts`
- Create: `tests/transcript-persistence.test.ts`

**Interfaces:**
- Consumes: existing job `result_metadata`, existing project `source_profile`, normalized `TranscriptSegment[]`, transcript text.
- Produces: `buildTranscriptResultMetadata(...)` and `buildTranscriptSourceProfile(...)` pure JSON patch builders.

- [ ] **Step 1: Write the failing tests**

Test with literal fixtures that a transcript update retains an existing `input`, `stage`, and `artifacts.animationPlan`, adds `artifacts.transcript`, sets `transcriptStatus` to `completed`, and retains source-profile `inspection` and `warnings` while adding `transcript`.

- [ ] **Step 2: Run the test and verify RED**

Run: `npx tsx --test tests/transcript-persistence.test.ts`

Expected: FAIL because `@/lib/server/transcript-persistence` does not exist.

- [ ] **Step 3: Implement the pure builders**

Implement builders that accept unknown JSON, narrow records safely, shallow-copy outer records and artifacts, and return new records without mutating input.

- [ ] **Step 4: Run the test and verify GREEN**

Run: `npx tsx --test tests/transcript-persistence.test.ts`

Expected: PASS.

### Task 2: Correct Completion Persistence

**Files:**
- Modify: `lib/server/direct-transcription.ts`
- Modify: `app/api/assets/[id]/transcript/sync/route.ts`
- Modify: `app/api/transcribe/route.ts`

**Interfaces:**
- Consumes: Task 1 builders and normalized AssemblyAI segments.
- Produces: checked Supabase updates to `result_metadata` and merged `source_profile`; sync responses containing `status`, `transcriptText`, and `segments`.

- [ ] **Step 1: Extend the failing persistence test for empty/null JSON inputs**

Assert literal completed metadata and profile output when existing JSON is `null`.

- [ ] **Step 2: Run the test and verify RED**

Run: `npx tsx --test tests/transcript-persistence.test.ts`

Expected: FAIL until null input is handled.

- [ ] **Step 3: Replace invalid durable-job writes**

Select `result_metadata`, merge through `buildTranscriptResultMetadata`, update `result_metadata`, and throw on required database errors. Merge project profile through `buildTranscriptSourceProfile`. Remove the unawaited background poller from upload dispatch; completion remains available through sync routes.

- [ ] **Step 4: Return completed transcript payloads**

Both status endpoints return the normalized `segments` and `transcriptText` after successful persistence, without replacing unrelated project profile fields.

- [ ] **Step 5: Run focused tests and typecheck**

Run: `npx tsx --test tests/transcript-persistence.test.ts tests/source-analysis.test.ts`

Run: `npm run typecheck`

Expected: PASS.

### Task 3: Editor Polling and Immediate Hydration

**Files:**
- Modify: `lib/hooks/useEditorState.ts`
- Modify: `app/editor/[id]/page.tsx` only if the existing adapter cannot consume hydrated state.
- Test: `tests/transcript-persistence.test.ts`

**Interfaces:**
- Consumes: sync response `{status, transcriptText, segments}` and current source asset ID.
- Produces: in-memory `project.sourceProfile.transcript` and `job.artifacts.transcript` immediately on completion.

- [ ] **Step 1: Add a failing test for response-to-job hydration**

Add a pure `applyTranscriptToProcessingJob` contract test showing that completion preserves existing job fields and artifacts while installing transcript segments.

- [ ] **Step 2: Run the test and verify RED**

Run: `npx tsx --test tests/transcript-persistence.test.ts`

Expected: FAIL because the hydration helper is absent.

- [ ] **Step 3: Implement polling independent of mock job status**

Poll when a source asset exists and current transcript segments are empty. On completion, update project and job React state from the response; stop re-polling once segments exist. Keep the existing cleanup and request throttle.

- [ ] **Step 4: Run focused tests and verify GREEN**

Run: `npx tsx --test tests/transcript-persistence.test.ts tests/source-analysis.test.ts`

Expected: PASS.

### Task 4: Full Verification

**Files:**
- No production files beyond Tasks 1-3.

**Interfaces:**
- Consumes: completed implementation.
- Produces: verification evidence for tests, types, build, and repository diff.

- [ ] **Step 1: Run regression tests**

Run: `npx tsx --test tests/transcript-persistence.test.ts tests/source-analysis.test.ts`

Expected: PASS.

- [ ] **Step 2: Run static checks**

Run: `npm run typecheck`

Expected: PASS.

- [ ] **Step 3: Run production build**

Run: `npm run build`

Expected: PASS.

- [ ] **Step 4: Review the scoped diff**

Run: `git diff --check` and `git diff -- lib/server/transcript-persistence.ts lib/server/direct-transcription.ts app/api/assets/[id]/transcript/sync/route.ts app/api/transcribe/route.ts lib/hooks/useEditorState.ts tests/transcript-persistence.test.ts`

Expected: no whitespace errors and no unrelated changes.
