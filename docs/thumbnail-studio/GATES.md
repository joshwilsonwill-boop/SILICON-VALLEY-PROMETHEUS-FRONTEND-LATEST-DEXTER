# Gates: Thumbnail Studio redesign and generation upgrade

OWNS: components/editor/ThumbnailStudioModal.tsx, components/editor/thumbnail-studio/**, lib/thumbnails/studio-*.ts, lib/thumbnails/nano-banana-image.ts, app/api/projects/[id]/thumbnails/nano-banana/route.ts, tests/thumbnail-studio-design.test.mjs, tests/thumbnail-studio-pipeline.test.mjs, tests/jarvis-thumbnail-ux.test.mjs, tests/short-form-thumbnail-engine.test.mjs, scripts/verify-thumbnail-studio-design.mjs, docs/thumbnail-studio/**

Scope: Upgrade the existing thumbnail workflow with a reference-led studio, controllable art direction, modern Nano Banana generation, recoverable variants, and verified responsive interactions.

- [x] G1: Layout, background, accent, emphasis, and quality selections produce validated generation requests with explicit composition instructions.
  CHECK: node --experimental-strip-types --test --test-reporter=tap tests/thumbnail-studio-design.test.mjs tests/nano-banana-image.test.mjs tests/thumbnail-studio-pipeline.test.mjs tests/jarvis-thumbnail-ux.test.mjs tests/short-form-thumbnail-engine.test.mjs
  EXPECT: /# fail 0/
  EVIDENCE: automatic-evidence=v1; definition-sha256=a6203aa65c9da7ed5f18904861205012e8c63e59909247be8a32e78393105e78; exit=0; EXPECT=matched; output-sha256=8b15d7b069e93b848128b4b9dff3a7cc47149627b20c38bc011fbbfce8963fa8; output-bytes=3650; shell=C:\Windows\system32\cmd.exe; cwd=C:\Users\HomePC\Documents\THE FRONT END, PROMETHEUS; path=b8509a2e0c33/38 entries

- [x] G2: The thumbnail studio compiles and introduces no lint errors in its changed files.
  CHECK: node scripts/verify-thumbnail-studio-design.mjs
  EXPECT: thumbnail studio checks passed
  EVIDENCE: automatic-evidence=v1; definition-sha256=b3b8392836e35c83fe20c340a3667f8a4837989977c8d0865065e36705e99d88; exit=0; EXPECT=matched; output-sha256=6f8ca42d1f0bfd27792ac5eff1517c34628a265968259a539d9e2eccafd5cc7d; output-bytes=31; shell=C:\Windows\system32\cmd.exe; cwd=C:\Users\HomePC\Documents\THE FRONT END, PROMETHEUS; path=b8509a2e0c33/38 entries

- [x] G3: The production application builds with the integrated thumbnail workflow.
  CHECK: npm.cmd run build
  EXPECT: /Compiled successfully/
  EVIDENCE: automatic-evidence=v1; definition-sha256=f5716df0aced06e4a73e6783d25c82f968cfdf47df3f00037b7b68192efb0ac3; exit=0; EXPECT=matched; output-sha256=ea15635c905d0d6a20d6c2eb0c80e32965d61f9128f63eb33d32c527d454d32c; output-bytes=5023; shell=C:\Windows\system32\cmd.exe; cwd=C:\Users\HomePC\Documents\THE FRONT END, PROMETHEUS; path=b8509a2e0c33/38 entries

- [x] G4: Browser interactions confirm live draft changes, frame selection, variants, cancellation, references, download, save, focus containment, and responsive layout.
  EVIDENCE: Actual components passed Chromium interaction review at 1440×900 and 390×844. Local API fixtures exercised successful generation/save/download plus cancellation, restore, save failure, generation failure, references, keyboard focus and Escape. See browser-review.md; paid generation is assessed separately.

- [x] G5: Visual review confirms the reference-led preview and side panel are readable at desktop and mobile widths.
  EVIDENCE: Inspected desktop-preview.png, mobile-preview.png, and mobile-controls.png. Large artwork and frame/layout rails remain readable; mobile controls stack and scroll without horizontal overflow. Persistent export controls and clear draft/generated labels verified. Images in the generation interaction fixtures are labeled test artwork.
