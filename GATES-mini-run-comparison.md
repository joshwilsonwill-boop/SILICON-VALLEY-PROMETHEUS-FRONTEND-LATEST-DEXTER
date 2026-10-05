# Gates: Mini-Run source and output comparison

OWNS: components/mini-run/**, lib/hooks/use-mini-run-longform-job.ts, tests/mini-run-comparison.test.tsx, GATES-mini-run-comparison.md

Scope: Verify the Mini-Run output claim and deliver an aspect-aware source to rendered-short comparison for single and batch results.

- [x] G1: Landscape and portrait sources render with their own proportions beside a selected portrait output
  CHECK: npx tsx tests/mini-run-comparison.test.tsx
  EXPECT: mini-run comparison verification passed
  EVIDENCE: automatic-evidence=v1; definition-sha256=201f337c741f1f4e26d7eff95d6f69c49cc9e60b7d1a87155ed59d060a0e270a; exit=0; EXPECT=matched; output-sha256=3a52402572937bcd0074db33ff02104daea32ef289f64d9e13b9872465a639be; output-bytes=40; shell=C:\Windows\system32\cmd.exe; cwd=C:\Users\HomePC\Documents\THE FRONT END, PROMETHEUS; path=81d468fb67af/38 entries

- [x] G2: The Mini-Run comparison changes typecheck cleanly with the application
  CHECK: npm run typecheck
  EXPECT: typecheck passed
  EVIDENCE: automatic-evidence=v1; definition-sha256=9aeeb689bde5257e0a85c8ecb0aad3fdaf9ace3e9e5076bbf6758c22760ccfe3; exit=0; EXPECT=matched; output-sha256=2c4af01fb1a5f9597841244575659986624ce8ada13bbc89dce9491fd48c4a46; output-bytes=93; shell=C:\Windows\system32\cmd.exe; cwd=C:\Users\HomePC\Documents\THE FRONT END, PROMETHEUS; path=81d468fb67af/38 entries

- [x] G3: The final report states the delivery verification limit and records the design reference evidence
  EVIDENCE: Code confirms native video playback, download anchors, polling, and an authenticated output route; no live cloud render was available to verify delivery. Visual direction reviewed against Originkit, Awwwards, Lusion, and ui-ux-pro-max search results.
