# Gates: Jarvis $2,000/Month Master Video Editor & Co-Director Blueprint

OWNS: lib/voice-companion/gemini-live-client.ts, lib/voice-companion/bridge.ts, hooks/use-voice-companion.ts, lib/autonomous-ui/coordinator.ts, lib/editor/timeline-document.ts, app/editor/[id]/page.tsx, components/editor/motion-edit-workspace.tsx, GATES-jarvis-v2k.md

Scope: Transform the Prometheus Jarvis frontend companion into a production-grade autonomous Co-Director and Master Video Editor capable of justifying a $2,000/month enterprise subscription tier.

- [ ] G1: Multi-Track Timeline & Audio Mixing Tools
  CHECK: node --import tsx --test tests/jarvis-multitrack-timeline.test.mjs
  EXPECT: jarvis-multitrack-timeline: all checks passed

- [ ] G2: Physical Ghost Cursor Takeover Binding
  CHECK: node --import tsx --test tests/jarvis-takeover-binding.test.mjs
  EXPECT: jarvis-takeover-binding: all checks passed

- [ ] G3: Model-Backed Generative Editorial Planner
  CHECK: node --import tsx --test tests/jarvis-model-planner.test.mjs
  EXPECT: jarvis-model-planner: all checks passed

- [ ] G4: Timeline State Rollback (Undo / Redo Engine)
  CHECK: node --import tsx --test tests/jarvis-undo-rollback.test.mjs
  EXPECT: jarvis-undo-rollback: all checks passed

- [ ] G5: Brand DNA Engine Synchronization
  CHECK: node --import tsx --test tests/jarvis-brand-dna-sync.test.mjs
  EXPECT: jarvis-brand-dna-sync: all checks passed

- [ ] G6: Durable Render Queue Dispatch & Progress Tracking
  CHECK: node --import tsx --test tests/jarvis-render-lifecycle.test.mjs
  EXPECT: jarvis-render-lifecycle: all checks passed

- [ ] G7: End-to-End Type Safety & Clean Compilation
  CHECK: npm.cmd run typecheck
  EXPECT: typecheck passed
