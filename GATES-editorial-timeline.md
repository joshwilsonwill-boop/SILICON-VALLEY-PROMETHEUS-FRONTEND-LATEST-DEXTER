# Gates: editorial timeline scrub area

OWNS: components/editor/editorial-timeline-tracks.tsx, components/editor/editorial-timeline-viewport.tsx, components/editor/motion-edit-workspace.tsx, lib/editor/editorial-timeline-state.ts, docs/editorial-timeline-contract.md

Scope: synchronize selected music with Motion, preserve source imagery, and display draggable playhead plus editable text and backend multimodal placements on the source-video timeline.

- [ ] G1: the updated editorial timeline code type-checks
  CHECK: npx tsc --noEmit --pretty false
  EXPECT: /^$/
  EVIDENCE: pending

- [ ] G2: the editorial timeline state and API contract tests pass
  CHECK: npx tsx --test tests/editorial-timeline-state.test.ts
  EXPECT: /# fail 0/
  EVIDENCE: pending

- [ ] G3: Music selection, audio-clock sync, overlapping text movement, saved backend cue placement, and direct playhead click-drag are confirmed in the Motion browser UI
  EVIDENCE: pending; browser session unavailable during this implementation pass

- [ ] G4: source frames render aspect-preserved without fabricated clip splits, and the synthetic Voice (Enhanced) lane is absent
  EVIDENCE: pending; visual acceptance requires the Motion browser UI
