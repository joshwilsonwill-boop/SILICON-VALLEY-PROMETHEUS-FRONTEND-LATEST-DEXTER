# Gates: Jarvis MP4 session

OWNS: app/editor/[id]/page.tsx, app/api/projects/[id]/exports/route.ts, components/editor/ExportDrawer.tsx, components/editor/editorial-delivery-studio.tsx, hooks/use-voice-companion.ts, lib/voice-companion/bridge.ts, lib/voice-companion/gemini-live-client.ts, lib/voice-companion/export-status.ts, tests/jarvis-mp4-session.test.mjs, docs/editorial-delivery-contract.md, GATES-jarvis-mp4-session.md

Scope: Correct the false saving blocker and give Jarvis confirmed export status, visible feedback, and an accurate explanation of the available MP4.

- [ ] G1: Source-based MP4 submission is independent of unrelated timeline saves, while source ownership and tracked receipt checks remain intact.
  EVIDENCE: pending source and runtime evidence review.

- [ ] G2: Jarvis can distinguish timeline sync, no submitted job, active rendering, failed rendering, and a downloadable completed MP4 from current project evidence.
  EVIDENCE: pending tool integration and runtime evidence review.

- [ ] G3: User-visible feedback and Jarvis instructions explain the available output and actual errors without promising a retry, completion time, or saved-timeline render unsupported by the worker.
  EVIDENCE: pending interface and instruction review against the session transcript and worker contract.
