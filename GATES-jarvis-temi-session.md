# Gates: Jarvis Temi voice incident

OWNS: lib/voice-companion/**, hooks/use-voice-companion.ts, app/editor/[id]/page.tsx, components/ui/music-player.tsx, components/editor/editorial-audio-preview.tsx, tests/jarvis*.test.*, docs/qa/jarvis-temi-session-2026-10-03.md

Scope: Account for every complaint in the supplied conversation and repair catalog browsing, music mixing and playback, and incomplete edit requests without claiming unsupported outcomes.

- [x] G1: Every explicit request and inferred failure in the conversation has a disposition and evidence in the incident report.
  EVIDENCE: Re-read UTF-8 source export; docs/qa/jarvis-temi-session-2026-10-03.md records 15 issue categories with timestamps and distinguishes explicit requests, ambiguous transcription, prior fixes and remaining B-roll/live-session work.

- [x] G2: Music browsing works without a query and catalog searches return available alternatives when recommendation services fail.
  CHECK: node --import tsx --test --test-reporter=tap --test-name-pattern=catalog tests/jarvis-temi-session.test.ts
  EXPECT: # fail 0
  EVIDENCE: automatic-evidence=v1; definition-sha256=18ec77338333db291c3156953ee4f622abdeaf722810eebba15fb041bcd3ef7a; exit=0; EXPECT=matched; output-sha256=0a4c4ea429609da430825ef55e94cdcd55b690a566b549c6d54e8094074392c0; output-bytes=1672; shell=C:\Windows\system32\cmd.exe; cwd=C:\Users\HomePC\Documents\THE FRONT END, PROMETHEUS; path=f185d44db9a0/38 entries

- [x] G3: Soundtrack volume and ducking commands validate input and confirm editor outcomes.
  CHECK: node --import tsx --test --test-reporter=tap --test-name-pattern=mix tests/jarvis-temi-session.test.ts
  EXPECT: # fail 0
  EVIDENCE: automatic-evidence=v1; definition-sha256=91b3c44b4fb6b0c50ee3eb64ac7e1f752c3331bb98ac6fecc139f02d4ec35999; exit=0; EXPECT=matched; output-sha256=2123e955ebe9a5fb96cdeac5998214974312e599fe4f02d129214b66c07c3007; output-bytes=1056; shell=C:\Windows\system32\cmd.exe; cwd=C:\Users\HomePC\Documents\THE FRONT END, PROMETHEUS; path=f185d44db9a0/38 entries

- [x] G4: Stopping music cancels all editor music players and a pending preview cannot restart after cancellation.
  CHECK: node --import tsx --test --test-reporter=tap --test-name-pattern=playback tests/jarvis-temi-session.test.ts
  EXPECT: # fail 0
  EVIDENCE: automatic-evidence=v1; definition-sha256=a4f825dff707061d2cdd0c5107bbd520ac857466c4785a78317e8f2a84fe21cc; exit=0; EXPECT=matched; output-sha256=ab27d207187b0d6acf85dbc650f15d161c2f3f4fc4110c3b01ee4720af4d891f; output-bytes=941; shell=C:\Windows\system32\cmd.exe; cwd=C:\Users\HomePC\Documents\THE FRONT END, PROMETHEUS; path=f185d44db9a0/38 entries

- [x] G5: Transcript and caption requests use the actual transcript state; multi-step edits retain all requested outcomes and explicitly report unsupported B-roll.
  CHECK: node --import tsx --test --test-reporter=tap --test-name-pattern=edit tests/jarvis-temi-session.test.ts
  EXPECT: # fail 0
  EVIDENCE: automatic-evidence=v1; definition-sha256=8038c16a0ab563ab3307f12e478b782f6f42a25b2f116d8ea4eb0198b96e35b4; exit=0; EXPECT=matched; output-sha256=32725e552449f5564207f70819f200c4acbd5eafa039fed163aaa5c4c42d25da; output-bytes=1796; shell=C:\Windows\system32\cmd.exe; cwd=C:\Users\HomePC\Documents\THE FRONT END, PROMETHEUS; path=f185d44db9a0/38 entries

- [x] G6: Existing Jarvis silence, language, editing-access, and music regression checks remain passing.
  EVIDENCE: audit-artifacts/jarvis-temi-tests.log records 34 passed, 0 failed across 20 incident tests plus seven existing regression files covering silence, language, access, interruption, music results, cross-workspace and song behavior.

- [x] G7: Type checking, changed-file lint and production build are verified; pre-existing repository-wide lint failures are documented.
  EVIDENCE: Final npm run typecheck passed; changed-file eslint passed with 0 errors and 13 warnings; production npm run build exited 0, generated 96/96 pages and passed prebuild/postbuild checks with NODE_OPTIONS=--max-old-space-size=8192. Corresponding audit-artifacts/jarvis-temi-*.log files record results. Earlier isolated repository-wide lint had 111 errors and 87 warnings, documented in the incident report.

- [x] G8: The final diff preserves unrelated work and the incident report distinguishes code verification from an authenticated microphone session.
  EVIDENCE: git diff --check passed for task-owned changed files. Core code already integrated by 90188b8; final helper/player/test corrections were applied selectively without replacing newer editor/hook/Mini-Run work. Concurrent timeline-document.ts, editorial-timeline-state.ts and its tests are preserved. Report explicitly states no authenticated microphone or edited-video export verification.

- [ ] G9: Requested B-roll is inserted from sourced footage and appears in a verified rendered output.
  EVIDENCE: Combined-edit test verifies an explicit unavailable outcome; no connected B-roll insertion/rendering handler or rendered footage proof exists.

ABANDON: G9 The repository has no connected B-roll insertion and rendering path. The ignored request is repaired with explicit per-step blocker reporting; actual footage insertion needs that missing editor/render capability. No B-roll or rendered-output claim is made.

- [ ] G10: An authenticated voice session verifies wakeword/language recognition, response completion, title questions and the original media commands end to end.
  EVIDENCE: Existing language/interruption regressions pass; the supplied export contains no raw audio, transport logs or authenticated session playback evidence.

ABANDON: G10 Deterministic tests cannot certify actual microphone recognition or Live model tool choice. No authenticated microphone replay was available in this task; repeat the report's voice-session acceptance sequence against real media.
