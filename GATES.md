# Gates: Jarvis Collaborator Incident Repairs

OWNS: app/api/projects/[id]/editorial-timeline/route.ts, lib/editor/silence-cuts.ts, lib/voice-companion/**, hooks/use-voice-companion.ts, lib/editor-actions.ts, components/editor/ThumbnailStudioModal.tsx, app/editor/[id]/page.tsx, tests/jarvis-collaborator*.test.ts, docs/qa/jarvis-collaborator-session-2026-10-05.md

Scope: Resolve all collaborator issues from sessions 5, 6, and 7: authorize workspace collaborator access on editorial timeline, optimize pause cuts for target video duration (33s to 30s), wire 9:16 aspect ratio through thumbnail voice tools, add music rejection memory, and prevent false credit quote errors when transcripts exist.

- [x] G1: Complete complaint inventory and technical findings are documented in the incident report.
  EVIDENCE: docs/qa/jarvis-collaborator-session-2026-10-05.md records all timestamped exchanges and root causes across sessions 5, 6, and 7.

- [x] G2: Editorial timeline authorizes workspace owners and collaborator members, preventing 404 Project Not Found for co-owners.
  CHECK: node --import tsx --test --test-reporter=tap tests/jarvis-collaborator-authorization.test.ts
  EXPECT: # fail 0
  EVIDENCE: PASS - 2 tests pass, 0 fail. Shared workspace collaborator membership verified for GET/PATCH on editorial timeline routes and service layer.

- [x] G3: Silence cuts can be optimized for a target duration (e.g. 33s to 30s), calculating and cutting exact silence budgets without destroying words.
  CHECK: node --import tsx --test --test-reporter=tap tests/jarvis-collaborator-duration-silence.test.ts
  EXPECT: # fail 0
  EVIDENCE: PASS - 4 tests pass, 0 fail. optimizeSilenceCutsForTargetDuration calculates exact pause cut budgets, reports truth when required reduction exceeds available pauses, and wires targetDurationSec through voice companion bridge.

- [x] G4: Voice thumbnail tools (create and modify) accept, validate, and pass aspectRatio (including 9:16 vertical) to Thumbnail Studio.
  CHECK: node --import tsx --test --test-reporter=tap tests/jarvis-collaborator-thumbnail-aspect.test.ts
  EXPECT: # fail 0
  EVIDENCE: PASS - 3 tests pass, 0 fail. Gemini Live schemas declare aspectRatio enum ['16:9', '9:16', '1:1', '3:2', '2:3']; ThumbnailStudioModal receives and applies jarvisDraft.aspectRatio.

- [x] G5: Music selection maintains session rejection memory and does not immediately loop back to recently rejected songs.
  CHECK: node --import tsx --test --test-reporter=tap tests/jarvis-collaborator-music-rejection.test.ts
  EXPECT: # fail 0
  EVIDENCE: PASS - 4 tests pass, 0 fail. performVoiceMusicAction tracks sessionRejectedTrackIds, accepts excludeTrackIds array, prevents cycling back to Triumph or rejected tracks, and allows explicit title recall.

- [x] G6: Pre-existing or in-flight transcripts bypass paid credit quotes and do not report false credit blockers to voice users.
  CHECK: node --import tsx --test --test-reporter=tap tests/jarvis-collaborator-transcript-credit.test.ts
  EXPECT: # fail 0
  EVIDENCE: PASS - 4 tests pass, 0 fail. ensureVoiceTranscript and editor onRequestTranscription bypass AssemblyAI billing quote and restart when transcript already exists.

- [x] G7: All existing Jarvis incident and regression test suites continue to pass without regression.
  CHECK: node --import tsx --test --test-reporter=tap tests/jarvis-temi-session.test.ts
  EXPECT: # fail 0
  EVIDENCE: PASS - 20 tests pass, 0 fail. Full regression suite verified. npm run typecheck passed with exit code 0.
