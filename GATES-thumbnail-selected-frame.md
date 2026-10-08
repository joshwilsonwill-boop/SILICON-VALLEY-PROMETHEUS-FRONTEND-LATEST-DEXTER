# Gates: selected frame thumbnail preview

OWNS: components/editor/ThumbnailStudioModal.tsx, components/editor/thumbnail-studio/ThumbnailWorkspace.tsx, lib/thumbnails/studio-draft.ts, tests/thumbnail-studio-pipeline.test.mjs

Scope: Show the selected source frame before generation and show generated artwork only after it has been created.

- [x] G1: The thumbnail pipeline regression check confirms the pre-generation frame preview and generated-artwork handoff.
  CHECK: node --import tsx --test --test-reporter=tap tests/thumbnail-studio-pipeline.test.mjs
  EXPECT: # fail 0
  EVIDENCE: automatic-evidence=v1; definition-sha256=9e273725903078369167e818255b7e872d60be2e1044fc6416ce8b96e2881a29; exit=0; EXPECT=matched; output-sha256=2544716e0f2c57cc2813eb5e0afc29cfd7a6e97c8bf9f5ecb90d169d785c29f5; output-bytes=341; shell=C:\Windows\system32\cmd.exe; cwd=C:\Users\HomePC\Documents\THE FRONT END, PROMETHEUS; path=ac9a491fd7da/38 entries

- [x] G2: The repository typecheck succeeds after the preview state change.
  CHECK: npm run typecheck
  EXPECT: typecheck passed
  EVIDENCE: automatic-evidence=v1; definition-sha256=9aeeb689bde5257e0a85c8ecb0aad3fdaf9ace3e9e5076bbf6758c22760ccfe3; exit=0; EXPECT=matched; output-sha256=2c4af01fb1a5f9597841244575659986624ce8ada13bbc89dce9491fd48c4a46; output-bytes=93; shell=C:\Windows\system32\cmd.exe; cwd=C:\Users\HomePC\Documents\THE FRONT END, PROMETHEUS; path=ac9a491fd7da/38 entries
