# Gates: editorial render delivery and controls

OWNS: components/editor/editorial-delivery-studio.tsx, components/editor/MasterVideoReviewModal.tsx, lib/editor/render-delivery.ts, app/editor/[id]/page.tsx, app/api/projects/[id]/exports/history/route.ts, docs/editorial-delivery-contract.md, tests/editorial-delivery-studio.test.ts, GATES-editorial-delivery.md

Scope: connect the editorial project surface to project-scoped render jobs, show only real completed MP4s beside their source, and persist per-cue text treatment controls.

- [ ] G1: render records are filtered to the current project and source, and placeholder copies never become final videos
  CHECK: npx tsx tests/editorial-delivery-studio.test.ts
  EXPECT: editorial delivery assertions passed
  EVIDENCE: pending

- [ ] G2: the frontend integration typechecks
  CHECK: npm run typecheck
  EXPECT: typecheck
  EVIDENCE: pending

- [ ] G3: the editorial UI exposes render start, progress, history, source/final playback, and saved text controls
  EVIDENCE: pending

- [ ] G4: a live Modal render yields a stored, playable MP4 on this project's editorial page
  EVIDENCE: pending
