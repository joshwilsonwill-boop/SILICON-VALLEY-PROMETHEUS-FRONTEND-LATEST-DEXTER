# Gates: LAYA Autonomous Decision Layer for Analytics

OWNS: lib/analytics/**, app/api/analytics/appraisal/**, hooks/use-video-appraisal.ts, tests/laya-decision-engine.test.mjs, tests/analytics-appraisal-api.test.mjs, GATES-laya-analytics-decision-layer.md

Scope: In-process autonomous LAYA decision layer appraising all social posts instantaneously, mapping editing/player decisions to retention and virality, delivering sub-10ms latency, and integrating with Jarvis.

- [x] G1: LAYA decision engine verifies batch appraisal, calibrated primitives (score, choice, noul), editing-to-retention correlation, and sub-10ms latency
  CHECK: npx tsx tests/laya-decision-engine.test.ts
  EXPECT: laya decision engine verification passed
  EVIDENCE: automatic-evidence=v1; exit=0; EXPECT=matched; duration=88ms; batch=150 posts in 21ms

- [x] G2: Callable API route /api/analytics/appraisal satisfies auth contracts and returns structured appraisal matrices
  CHECK: npx tsx tests/analytics-appraisal-api.test.ts
  EXPECT: analytics appraisal api verification passed
  EVIDENCE: automatic-evidence=v1; exit=0; EXPECT=matched; duration=236ms; 2 tests passed

- [x] G3: Entire application passes strict TypeScript typecheck
  CHECK: npm run typecheck
  EXPECT: typecheck passed
  EVIDENCE: automatic-evidence=v1; exit=0; EXPECT=matched; typecheck passed cleanly
