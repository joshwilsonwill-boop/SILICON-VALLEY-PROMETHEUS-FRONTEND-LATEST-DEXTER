# Gates: Jarvis export preflight

OWNS: lib/voice-companion/gemini-live-client.ts, hooks/use-voice-companion.ts, hooks/use-project-export-readiness.ts, lib/voice-companion/bridge.ts, components/editor/autonomous/jarvis-conversation-panel.tsx, app/editor/[id]/page.tsx, app/api/projects/[id]/exports/route.ts, components/editor/ExportDrawer.tsx, docs/jarvis-capability-gaps.md, GATES-jarvis-export-preflight.md

Scope: Give users a clear readiness review before export, separate review from explicit submission, show visible progress and confirmed receipts, and accurately identify whether output includes the saved editor timeline.

- [x] G1: Jarvis distinguishes a request to review pipeline readiness from a request to submit a render job.
  EVIDENCE: manual source review confirms readiness phrases route to `review_export_readiness`; voice and editor-chat render actions only open preflight and cannot submit a job.

- [x] G2: The preflight reports source availability, backend configuration, saved revision, output profile, defaults, and whether saved timeline edits are included, with blockers and assumptions visible before submission.
  EVIDENCE: manual source review confirms the authenticated readiness GET checks source storage and server configuration, returns the saved revision, and presents the 1080x1920 MP4, up-to-30-second window, automatic music, worker-planned captions, and timeline omission.

- [x] G3: Render submission requires an explicit user request, returns a tracked job receipt, and keeps progress and terminal status visible in the editor.
  EVIDENCE: manual source trace confirms only the panel CTA calls the project render route; the route persists and returns the export receipt, and the editor opens its delivery progress view after acceptance.

- [x] G4: Every export label and Jarvis response accurately distinguishes source-based Mini-Run output from a rendered copy of the saved timeline, including the worker's automatic music and caption behavior.
  EVIDENCE: manual source copy audit confirms Jarvis, preflight, dispatch receipt, and capability docs identify the source-based output and excluded editor timeline layers.
