# Gates: Jarvis autonomous edit pipeline

OWNS: hooks/use-voice-companion.ts, lib/voice-companion/bridge.ts, lib/voice-companion/gemini-live-client.ts, lib/editor/editorial-timeline-state.ts, lib/editor/timeline-document.ts, lib/voice-companion/music-controls.ts, components/editor/motion-edit-workspace.tsx, components/editor/MasterVideoReviewModal.tsx, components/editor/DownloadDialog.tsx, app/editor/[id]/page.tsx, docs/jarvis-capability-gaps.md, GATES-jarvis-edit-pipeline.md

Scope: Complete supported delegated edit actions through the editor's persisted timeline and visible Motion preview, and report only confirmed outcomes.

- [ ] G1: A delegated editorial plan applies and confirms its supported caption and movement changes through the project timeline backend.
  EVIDENCE: implementation waits for timeline save confirmation and exposes supported changes in Motion; browser/API acceptance remains pending
- [ ] G2: The Motion preview visibly reflects persisted plan movement cues and saved caption style.
  EVIDENCE: pending; browser acceptance not run
- [x] G3: Editing access activation is confirmed before protected mutations continue, without asking the user to enable it again during a delegated task.
  EVIDENCE: `tests/jarvis-editing-access.test.mjs`, `tests/jarvis-network-recovery.test.mjs`; automatic activation, active-session reuse, and unconfirmed access failure
- [x] G4: Music selection, preview, export, and render wording distinguish staged, audible, queued, and completed outcomes.
  EVIDENCE: `tests/jarvis-music-edit-results.test.mjs`; source download/review labels updated to identify preview/source copy; production build acceptance pending
- [x] G5: Capability documentation matches the implemented visual inspection, persistence, rendering, and recovery paths.
  EVIDENCE: `docs/jarvis-capability-gaps.md` documents the separate VINCERE worker and the editor integration gaps
- [ ] G7: The editorial decision is produced by the configured backend Flash planner and remains grounded in current project evidence.
  EVIDENCE: pending; the current planner is a local heuristic
- [ ] G6: The final exported MP4 contains the saved Jarvis timeline edits and is delivered to the user.
  EVIDENCE: pending; the VINCERE render worker exists separately, but editor timeline mapping, durable job ownership, source access, and artifact delivery are not connected or validated

BLOCKED: G6 remains required. The editor currently has no verified production render API target or editor-to-worker contract for source access, timeline manifest mapping, durable job ownership, and artifact delivery. The separate VINCERE queue cannot be safely presented as this editor's final export until those connections are implemented and verified end to end. The source-copy UI now states this limitation plainly.
