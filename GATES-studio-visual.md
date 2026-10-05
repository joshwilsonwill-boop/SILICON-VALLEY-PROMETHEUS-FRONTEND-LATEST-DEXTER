# Gates: Studio visual restoration

OWNS: app/layout.tsx, app/globals.css, app/page.tsx, app/settings/profile/page.tsx, components/LandingHeader.tsx, components/root-layout-frame.tsx, components/brand-wordmark.tsx, components/video-upload-interface.tsx, components/global-help-launcher.tsx, lib/theme/theme-tokens.ts, eslint.config.mjs, tests/studio-visual-restoration.test.mjs, tests/elegist-font-loading.test.mjs, scripts/verify-studio-visual-runtime.mjs

Scope: Restore the Studio's branded type, heading hierarchy, masthead spacing, and help control while retaining current editing and navigation behavior.

- [x] G1: The original display faces are registered and existing editorial font expectations pass.
  CHECK: node --test tests/elegist-font-loading.test.mjs
  EXPECT: pass 1
  EVIDENCE: automatic-evidence=v1; definition-sha256=50f6bbada932270a054ca4b7c88c4a50d8cb4f0e31a890e56ea03a20344acde4; exit=0; EXPECT=matched; output-sha256=1dce7c8fd5e2a6e8cc12a3669dbf07df088fb6b618dc8e7a2f3a649f7c1fce7f; output-bytes=168; shell=C:\Windows\system32\cmd.exe; cwd=C:\Users\HomePC\Documents\THE FRONT END, PROMETHEUS; path=f185d44db9a0/38 entries

- [x] G2: Studio masthead and hero presentation avoid duplicate headers and clipped heading text.
  CHECK: node --test tests/studio-visual-restoration.test.mjs
  EXPECT: pass 1
  EVIDENCE: automatic-evidence=v1; definition-sha256=908d5ae070a8fb71757e075f7e6c95c67c4858ca1f0acc31a1fe13bce8254fc7; exit=0; EXPECT=matched; output-sha256=683aef7197294c27d2639f66c78d74ca38cf8b486b33b9b8d32a2a5d3a06809c; output-bytes=222; shell=C:\Windows\system32\cmd.exe; cwd=C:\Users\HomePC\Documents\THE FRONT END, PROMETHEUS; path=f185d44db9a0/38 entries

- [x] G3: Existing Studio interaction regression checks pass.
  CHECK: node --test tests/studio-morph-heading-regression.test.mjs tests/studio-navigation-regression.test.mjs tests/studio-chat-simplification.test.mjs
  EXPECT: pass 3
  EVIDENCE: automatic-evidence=v1; definition-sha256=8f0e7165487240941ddcfd47254ad11e37a6136a9516c031905efbbb02e3f913; exit=0; EXPECT=matched; output-sha256=be4c24bbfb0a3f2bcb3b0e8729bb7e19d6237c06d97dc32f96892978a03768eb; output-bytes=416; shell=C:\Windows\system32\cmd.exe; cwd=C:\Users\HomePC\Documents\THE FRONT END, PROMETHEUS; path=f185d44db9a0/38 entries

- [x] G6: Saved appearance choices keep their original font and theme palettes.
  CHECK: npx tsx --test tests/theme-preferences.test.ts
  EXPECT: pass 1
  EVIDENCE: automatic-evidence=v1; definition-sha256=aae5692e6b153fb0a832236f17c87e3e5cdb10cc1ff905bbb712125763a6a539; exit=0; EXPECT=matched; output-sha256=c3ded064b7f31fd88fcfb2afa8a138d79afdd70f27839fd0893a3a28cac47d94; output-bytes=164; shell=C:\Windows\system32\cmd.exe; cwd=C:\Users\HomePC\Documents\THE FRONT END, PROMETHEUS; path=f185d44db9a0/38 entries

- [ ] G4: The revised Studio has been inspected at desktop and mobile widths for readable hierarchy, working help, and correct brand imagery.
  EVIDENCE: pending

- [ ] G5: Typecheck, lint, and production build complete with the repository toolchain.
  EVIDENCE: pending
