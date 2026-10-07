# Gates: VINCERE Mini-Run editor render integration

OWNS: app/api/projects/[id]/exports/route.ts, app/api/projects/[id]/exports/history/route.ts, app/api/exports/[id]/preview/route.ts, app/api/exports/[id]/download-url/route.ts, app/api/mini-run/**, components/editor/editorial-delivery-studio.tsx, hooks/use-voice-companion.ts, lib/api/mini-run.ts, lib/voice-companion/bridge.ts, lib/voice-companion/gemini-live-client.ts, lib/editor/render-delivery.ts, lib/exports/service.ts, lib/server/mini-run-*, tests/editorial-mini-run-render.test.ts, docs/editorial-delivery-contract.md, GATES-vincere-mini-run-editor-render.md

Scope: Connect authenticated editor and Jarvis final-render requests to the VINCERE Mini-Run pipeline, surface durable real job progress, and deliver the resulting MP4 in the project editor.

- [ ] G1: The dispatch payload preserves the editor's source, requested output profile, and saved editorial decisions supported by the Mini-Run worker; unsupported edits are reported before dispatch.
  CHECK: node --import tsx --test tests/editorial-mini-run-render.test.ts
  EXPECT: editorial Mini-Run contract assertions passed
  EVIDENCE: pending

- [ ] G2: Chat and Jarvis start the same authenticated durable render job, and do not claim success until the backend returns its job identifier.
  CHECK: node --import tsx --test tests/editorial-mini-run-render.test.ts
  EXPECT: editorial Mini-Run contract assertions passed
  EVIDENCE: pending

- [ ] G3: The UI resumes polling after reload, shows only backend-reported progress, and plays/downloads the MP4 associated with the current project and source.
  CHECK: node --import tsx --test tests/editorial-mini-run-render.test.ts
  EXPECT: editorial Mini-Run contract assertions passed
  EVIDENCE: pending

- [ ] G4: The integrated implementation typechecks.
  CHECK: npm.cmd run typecheck
  EXPECT: typecheck verification passed
  EVIDENCE: pending

- [ ] G5: The Modal receipt matches the audited backend deployment commit, and the rendered video, audio, and delivery are inspected.
  EVIDENCE: pending

- [ ] G6: The Mini-Run worker advances durable progress as Modal slices finish, while keeping 100% for the completed render receipt.
  CHECK: python -m unittest mini_run_pipeline.test_slice_dispatch_progress
  EXPECT: Ran 1 test and the suite passed
  CWD: C:/Users/HomePC/Downloads/PROMETHEUS-VINCERE-BACKEND
  EVIDENCE: pending
