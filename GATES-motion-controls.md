# Gates: Thumbnail direction and motion controls

OWNS: lib/thumbnails/creative-direction.ts, app/api/projects/[id]/thumbnails/nano-banana/route.ts, lib/editor/motion-framing.ts, lib/editor/timeline-tools.ts, hooks/use-timeline-tools.ts, components/editor/motion-edit-workspace.tsx, components/editor/editorial-timeline-*.tsx, tests/motion-controls.test.ts, GATES-motion-controls.md

Scope: Honor explicit thumbnail style requests and make motion framing and timeline tools work.

- [x] G1: Thumbnail direction, framing geometry and timeline operations pass behavioral checks
  CHECK: node --import tsx --test tests/motion-controls.test.ts
  EXPECT: fail 0
  EVIDENCE: automatic-evidence=v1; definition-sha256=fd52ffaeebe628372803bdc17f4c0f97215e75fda8ce0965655b9b5ca6bba7cd; exit=0; EXPECT=matched; output-sha256=b8316ef32ae6b619a42f30465c95cee3bdb80542500e63570953216cf88ea63a; output-bytes=455; shell=C:\Windows\system32\cmd.exe; cwd=C:\Users\HomePC\Documents\THE FRONT END, PROMETHEUS; path=106950682d34/38 entries

- [x] G2: Updated frontend passes type checking
  CHECK: npm.cmd run typecheck
  EXPECT: typecheck passed
  EVIDENCE: automatic-evidence=v1; definition-sha256=56b8397f882f4f2eadc0c80ea6715604685447378d3170601b74e5c567ac8ef1; exit=0; EXPECT=matched; output-sha256=2c4af01fb1a5f9597841244575659986624ce8ada13bbc89dce9491fd48c4a46; output-bytes=93; shell=C:\Windows\system32\cmd.exe; cwd=C:\Users\HomePC\Documents\THE FRONT END, PROMETHEUS; path=106950682d34/38 entries

- [x] G3: Production build succeeds
  CHECK: npm.cmd run build
  EXPECT: No dev bypass tokens found in production build output.
  EVIDENCE: automatic-evidence=v1; definition-sha256=263037f13800a454ab26a0ee2d7462d513b0b892f31fd6b7044d205772d05ae3; exit=0; EXPECT=matched; output-sha256=0e601a49994182f173cd375a12ec3cf9f99fdf001e8de269b02465f804f1ab0c; output-bytes=5104; shell=C:\Windows\system32\cmd.exe; cwd=C:\Users\HomePC\Documents\THE FRONT END, PROMETHEUS; path=106950682d34/38 entries

- [x] G4: A browser exercises aspect presets, crop scaling and timeline tools
  EVIDENCE: Chromium isolated component harness passed .unlazy/motion-control-review/check.mjs: all three aspect presets, crop handle scaling/reset, split preserving source time, selected clip deletion, undo/redo, marker selection through playhead, cue duplication, silence and speech cuts. Screenshot: .unlazy/motion-control-review/verified.png. Network persistence and paid image output are not simulated as verified production outcomes.
