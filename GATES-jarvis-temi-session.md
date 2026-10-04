# Gates: Jarvis Temi voice incident

OWNS: lib/voice-companion/**, hooks/use-voice-companion.ts, app/editor/[id]/page.tsx, tests/jarvis-temi-session.test.ts, docs/qa/jarvis-temi-session-2026-10-03.md

Scope: Account for every complaint in the supplied conversation and repair catalog browsing, music mixing and playback, and incomplete edit requests without claiming unsupported outcomes.

- [ ] G1: Every explicit request and inferred failure in the conversation has a disposition and evidence in the incident report.
  EVIDENCE: pending

- [ ] G2: Music browsing works without a query and catalog searches return available alternatives when recommendation services fail.
  CHECK: node --import tsx --test --test-name-pattern=catalog tests/jarvis-temi-session.test.ts
  EXPECT: # fail 0
  EVIDENCE: pending

- [ ] G3: Soundtrack volume and ducking commands validate input and confirm editor outcomes.
  CHECK: node --import tsx --test --test-name-pattern=mix tests/jarvis-temi-session.test.ts
  EXPECT: # fail 0
  EVIDENCE: pending

- [ ] G4: Stopping music cancels all editor music players and a pending preview cannot restart after cancellation.
  CHECK: node --import tsx --test --test-name-pattern=playback tests/jarvis-temi-session.test.ts
  EXPECT: # fail 0
  EVIDENCE: pending

- [ ] G5: Transcript and caption requests use the actual transcript state; multi-step edits retain all requested outcomes and explicitly report unsupported B-roll.
  CHECK: node --import tsx --test --test-name-pattern=edit tests/jarvis-temi-session.test.ts
  EXPECT: # fail 0
  EVIDENCE: pending

- [ ] G6: Existing Jarvis silence, language, editing-access, and music regression checks remain passing.
  EVIDENCE: pending

- [ ] G7: Type checking, changed-file lint and production build are verified; pre-existing repository-wide lint failures are documented.
  EVIDENCE: pending

- [ ] G8: The final diff preserves unrelated work and the incident report distinguishes code verification from an authenticated microphone session.
  EVIDENCE: pending
