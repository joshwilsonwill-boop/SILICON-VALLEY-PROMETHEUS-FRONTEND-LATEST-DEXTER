# Gates: Jarvis render feedback

OWNS: hooks/use-voice-companion.ts, lib/voice-companion/bridge.ts, lib/voice-companion/gemini-live-client.ts, app/editor/[id]/page.tsx, components/editor/editorial-delivery-studio.tsx, docs/editorial-delivery-contract.md, GATES-jarvis-render-feedback.md

Scope: Report final-render start outcomes truthfully and surface live backend status without inventing progress.

- [x] G1: Jarvis reports final rendering as started only after the editor confirms a render job was accepted.
  EVIDENCE: Source review confirms the voice render tool returns the editor's failed result and only sets `renderInitiated` after a tracked export id is returned.

- [x] G2: The export panel shows queued/processing state and the renderer's progress when supplied, without presenting a fabricated percentage.
  EVIDENCE: Source review confirms status history refreshes every five seconds, active jobs show an indeterminate bar by default, and only finite `metadata.progressPercent` values are rendered as percentages.

- [ ] G3: The editor can produce and deliver a final MP4 from its saved timeline through a durable backend job.
ABANDON: G3 The configured export POST route explicitly returns RENDER_UNAVAILABLE, and no connected worker accepts this editor's timeline or reports durable progress. Handoff: implement and validate the editor-to-render worker contract and output storage before claiming final render support.
