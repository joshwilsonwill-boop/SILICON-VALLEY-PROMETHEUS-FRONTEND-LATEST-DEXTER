# Gates: Motion Studio timeline expansion

OWNS: components/editor/motion-edit-workspace.tsx, tests/fixtures/motion-timeline-header-entry.tsx, tests/motion-timeline-header-collapse.test.mjs, tests/motion-timeline-resize-regression.test.mjs, GATES-motion-timeline-header.md

Scope: Collapse the highlighted Motion Studio metadata and framing controls as the editorial timeline expands, while preserving the export action, tool navigation, and preview resize behavior.

- [ ] G1: A browser resize check shows the highlighted controls collapse progressively and return when the timeline shrinks, while export and tool navigation remain available.
  CHECK: node tests/motion-timeline-header-collapse.test.mjs
  EXPECT: motion timeline header collapse: browser checks passed
  EVIDENCE: pending

- [ ] G2: The updated editor type-checks.
  CHECK: npm.cmd run typecheck
  EXPECT: typecheck passed
  EVIDENCE: pending

- [ ] G3: Existing timeline resize checks still pass.
  CHECK: node tests/motion-timeline-resize-regression.test.mjs
  EXPECT: motion timeline resize regression passed
  EVIDENCE: pending
