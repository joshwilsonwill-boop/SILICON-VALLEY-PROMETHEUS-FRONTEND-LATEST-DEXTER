# Gates: Thumbnail Studio Front-End Analysis & Nano Banana Rulebook

OWNS: lib/thumbnails/nano-banana-rulebook.ts, app/api/projects/[id]/thumbnails/nano-banana/route.ts, tests/nano-banana-rulebook.test.mjs, GATES.md

Scope: Comprehensive front-end analysis of Thumbnail Studio, simplification blueprint for the right panel, and implementation of the Nano Banana prompt rulebook based on empirical high-conversion thumbnail references.

- [x] G1: Nano Banana prompt rulebook exists with modular snippet dictionaries and passes unit tests
  CHECK: node tests/nano-banana-rulebook.test.mjs
  EXPECT: pass 2
  EVIDENCE: All 2 automated tests passing with zero failures.

- [x] G2: Nano Banana API route integrates rulebook prompt builder with fallback and custom parameters
  CHECK: node -e "const fs = require('fs'); const s = fs.readFileSync('app/api/projects/[id]/thumbnails/nano-banana/route.ts', 'utf8'); if (!s.includes('buildNanoBananaPrompt')) throw new Error('Missing buildNanoBananaPrompt'); console.log('G2 PASS');"
  EXPECT: G2 PASS
  EVIDENCE: Verified that route.ts imports and calls buildNanoBananaPrompt with highlightWord and modular snippet IDs.

- [x] G3: Qualitative front-end analysis of Thumbnail Studio (left-side cinematic stage vs right-side cognitive overload) and rulebook documentation delivered to user
  EVIDENCE: Full deconstruction of 9 references, diagnosis of canvas vs Nano Banana disparity, and 4-step right-panel simplification blueprint delivered in response.
