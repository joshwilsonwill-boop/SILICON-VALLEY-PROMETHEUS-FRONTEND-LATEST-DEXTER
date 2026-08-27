# Chat Image Paste Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make pasted local images become removable Prometheus chat attachments and send them with the prompt.

**Architecture:** Add a small pure clipboard extraction helper beside the existing attachment validation utilities. Wire the editor page's existing pending-attachment callback to paste events in both composer input states, preserving the existing FileReader/data-URL payload and API contract.

**Tech Stack:** Next.js, React, TypeScript, Node test runner.

## Global Constraints

- Only image clipboard items are attachments; text clipboard content must paste normally.
- Pending chat attachments are capped at four.
- Existing attachment payload and `/api/prometheus-chat` request shape remain unchanged.

### Task 1: Clipboard extraction contract

**Files:**
- Modify: `lib/editor/chat-attachment.ts`
- Test: `tests/chat-image-paste.test.ts`

**Interfaces:**
- Produces `extractImageFilesFromClipboard(data: DataTransfer): File[]`.

- [ ] Write a failing test covering image extraction, non-image items, and four-item capping.
- [ ] Run `node --test tests/chat-image-paste.test.ts` and verify the helper is missing.
- [ ] Implement the pure helper using `data.items`, `kind === 'file'`, and `type.startsWith('image/')`.
- [ ] Run the focused test and verify it passes.

### Task 2: Wire paste into editor chat

**Files:**
- Modify: `app/editor/[id]/page.tsx`

**Interfaces:**
- Consumes `extractImageFilesFromClipboard` and the existing `addPendingChatAttachments` callback.

- [ ] Add a paste callback that converts extracted files to a `FileList`-compatible input or directly shares the existing file-array path.
- [ ] Attach it to both compact and expanded editor chat text inputs without preventing text-only paste.
- [ ] Preserve the existing picker and remove behavior.

### Task 3: Verification

**Files:**
- Test: `tests/chat-image-paste.test.ts`

- [ ] Run focused tests, typecheck, and relevant existing chat regression tests.
- [ ] Inspect the final diff for unrelated changes.
