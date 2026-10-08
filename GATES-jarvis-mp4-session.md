# Gates: Jarvis MP4 session

OWNS: app/editor/[id]/page.tsx, app/api/projects/[id]/exports/route.ts, components/editor/ExportDrawer.tsx, components/editor/editorial-delivery-studio.tsx, hooks/use-voice-companion.ts, lib/voice-companion/bridge.ts, lib/voice-companion/gemini-live-client.ts, lib/voice-companion/export-status.ts, tests/jarvis-mp4-session.test.mjs, docs/editorial-delivery-contract.md, GATES-jarvis-mp4-session.md

Scope: Correct the false saving blocker and give Jarvis confirmed export status, visible feedback, and an accurate explanation of the available MP4.

- [x] G1: Source-based MP4 submission is independent of unrelated timeline saves, while source ownership and tracked receipt checks remain intact.
  EVIDENCE: Manually reviewed editor and authenticated route against the worker contract. Runtime tests execute the actual editor callback in loading, saving, saved-with-stale-source, and error states; route tests accept a stale revision and reject unauthenticated, replaced-source, and invalid requests. Rejected, missing, and timed-out receipts are reported accurately.

- [x] G2: Jarvis can distinguish timeline sync, no submitted job, active rendering, failed rendering, and a downloadable completed MP4 from current project evidence.
  EVIDENCE: Manually traced bridge, voice executor, status reader, and authenticated history/delivery routes. Runtime tests exercise the actual voice executor and status reader for no-job, queued, processing, failed, completed, missing-file, invalid-progress, network-error, and changed-project cases. Static rendering confirms a completed source MP4 exposes playback and download controls.

- [x] G3: User-visible feedback and Jarvis instructions explain the available output and actual errors without promising a retry, completion time, or saved-timeline render unsupported by the worker.
  EVIDENCE: Manually reviewed system instructions, preflight, delivery copy, and contract against the supplied session. Server-rendered UI tests verify distinct loading/saving/saved/error text, the sync retry control, and an enabled source export despite sync errors. Combined targeted run: 34 passed, 0 failed; TypeScript passed. This is local code/fixture evidence, not a live Gemini conversation or a rendered MP4 verification.
