# Gates: Jarvis truthful media awareness and clear control states

OWNS: lib/voice-companion/gemini-live-client.ts, lib/voice-companion/bridge.ts, hooks/use-voice-companion.ts, components/navigation/jarvis-top-nav-filament.tsx, app/editor/[id]/page.tsx, docs/jarvis-capability-gaps.md, tests/jarvis-cross-workspace-video-context-regression.test.mjs, GATES-jarvis.md

Scope: Make Jarvis accurately describe available media and completed actions, expose clear voice/editing power states, and document capability gaps.

- [x] G1: Jarvis distinguishes playable source media from timeline duration and transcript-only context.
  EVIDENCE: Reviewed the editor bridge and tool handlers: empty scene lists resolve to 0 duration; `hasVideo` requires a playable video preview; source duration, timeline duration, media state, and transcript availability are reported separately. Media mutations fail with a concise blocker when source media or timed transcript data is absent. TypeScript typecheck passed.

- [x] G2: Voice connection and autonomous editing states are plainly labeled and accessible.
  EVIDENCE: Reviewed the global dock: voice power and editing access have persistent ON/OFF badges, independent `role=switch` and `aria-checked` states, descriptive labels, and distinct active, inactive, connecting, and error colors.

- [x] G3: The capability map separates working features from unsupported or incomplete workflows.
  EVIDENCE: Reviewed docs/jarvis-capability-gaps.md against the current tool declarations and editor bridge; working actions and their gates are listed separately from missing visual inspection, media repair, full plan application, undo, render lifecycle, and persistence confirmation.
