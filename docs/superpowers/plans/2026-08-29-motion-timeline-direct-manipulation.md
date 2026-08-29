# Motion Timeline Direct Manipulation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task with review checkpoints.

**Goal:** Add direct manipulation, snapping, navigation, independent block properties, splitting, and preview/timeline selection sync to the Motion workspace timeline.

**Architecture:** Keep the existing Motion workspace as the integration boundary and add a pure `lib/timeline/motion-timeline.ts` module for item construction and editing math. Timeline and preview share a local item list and selected item id; all edits remain session-local until persistence is specified.

**Tech Stack:** Next.js, React, TypeScript, Tailwind CSS, Vitest/node test runner already used by the repository, existing `lib/timeline/snap-engine.ts`, Lucide icons.

## Global Constraints

- The compact Editor timeline and its existing canvas timeline must not change behavior.
- Do not add a timeline dependency.
- Keep timeline edits local to the Motion workspace; do not mutate persisted transcript records.
- Enforce a 100 ms minimum item duration and clamp all edits to `[0, duration]`.

---

### Task 1: Specify timeline item editing math

**Files:**
- Create: `tests/motion-timeline-editing.test.ts`
- Create: `lib/timeline/motion-timeline.ts`

**Interfaces:**
- Produces `MotionTimelineItem`, `buildMotionTimelineItems`, `moveMotionTimelineItem`, `trimMotionTimelineItem`, `splitMotionTimelineItem`, and `buildMotionSnapPoints` for the Motion UI.

- [ ] **Step 1: Write the failing tests**

  Cover: construction of independent caption/text items, movement with a snap point, start/end trimming with bounds and minimum duration, and splitting inside an item while preserving metadata and creating a new id.

- [ ] **Step 2: Run the focused test and confirm it fails**

  Run `npx tsx --test tests/motion-timeline-editing.test.ts`.
  Expected: module/function-not-found failures because the pure module is not implemented yet.

- [ ] **Step 3: Implement the pure module**

  Represent times in seconds, convert snap candidates to milliseconds only at the existing snap-engine boundary, clamp all output to the supplied duration, and preserve non-timing metadata through every operation.

- [ ] **Step 4: Run the focused test and confirm it passes**

  Run `npx tsx --test tests/motion-timeline-editing.test.ts` and expect all cases to pass.

### Task 2: Wire Motion timeline navigation and block gestures

**Files:**
- Modify: `components/editor/motion-edit-workspace.tsx`

**Interfaces:**
- Consumes the pure helpers from Task 1.
- Produces pixel-scaled two-axis timeline rendering, selectable item blocks, edge trim handles, center dragging, snap feedback, and a synchronized playhead.

- [ ] **Step 1: Add local timeline item and selection state**

  Initialize items from the existing source/transcript/text props, reset only when the input signature changes, and retain local edits otherwise.

- [ ] **Step 2: Render a pixel-scaled scroll surface**

  Derive content width from duration, zoom, and a fixed pixels-per-second scale. Enable horizontal and vertical scrolling and position ruler ticks, blocks, and playhead in that same coordinate system.

- [ ] **Step 3: Add move, trim, selection, and snapping pointer handlers**

  Stop block gestures from starting background panning, use pointer capture, map pointer deltas to seconds, call the pure helpers, and seek/select on click.

- [ ] **Step 4: Add keyboard-accessible block controls**

  Give blocks and handles labels/focus styles and support selection without requiring a pointer.

### Task 3: Add properties, split, and bidirectional preview sync

**Files:**
- Modify: `components/editor/motion-edit-workspace.tsx`

**Interfaces:**
- Consumes the selected item state and edit handlers from Task 2.
- Produces a compact selected-item properties panel, split action, and clickable active preview overlays that select matching timeline blocks.

- [ ] **Step 1: Add timing and text property controls**

  Expose start, end, text, region, color, and animation controls as appropriate for the selected item; route timing through the same clamp/trim helpers.

- [ ] **Step 2: Add split behavior**

  Enable the scissors action only when the playhead is strictly inside the selected item, replace it with two independent blocks, and select the second block.

- [ ] **Step 3: Link preview overlays to timeline selection**

  Render active caption/text items as buttons over the preview. Clicking an overlay selects its item and seeks to its start; current-time changes highlight the corresponding timeline item.

### Task 4: Verify and document the finished behavior

**Files:**
- Modify: `components/editor/motion-edit-workspace.tsx` (only if verification reveals defects)
- Test: `tests/motion-timeline-editing.test.ts`

- [ ] **Step 1: Run focused and repository checks**

  Run `npx tsx --test tests/motion-timeline-editing.test.ts`, the repository typecheck command, and the production build command used by the project.

- [ ] **Step 2: Run a Playwright Motion workspace smoke check**

  Start/use the existing dev server, navigate to an available editor route, and verify the timeline, zoom, selection, and preview/playhead synchronization. Record any auth/data limitation if the route cannot be reached locally.

- [ ] **Step 3: Review the diff**

  Confirm only the Motion workspace, pure helper, focused tests, and design/plan docs are staged; leave unrelated worktree changes untouched.
