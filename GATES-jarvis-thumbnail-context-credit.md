# Gates: Jarvis thumbnail context and transcription credits

OWNS: lib/voice-companion/gemini-live-client.ts, tests/jarvis-thumbnail-credit-regression.test.mjs, GATES-jarvis-thumbnail-context-credit.md

Scope: A thumbnail request uses the active video's inspected frames and does not trigger paid transcription when no transcript is already available.

- [x] G1: Thumbnail instructions make existing transcript context optional and prohibit starting transcription solely for a thumbnail.
  EVIDENCE: Source review confirmed the thumbnail tool description, headline guidance, creative-direction guidance, and Live system instruction all make existing transcript context optional and prohibit transcription for thumbnail work.

- [x] G2: The updated tool guidance preserves video inspection and generation behavior while keeping explicit transcription requests available.
  EVIDENCE: Source review and the regression check confirmed thumbnail instructions still require project-state and frame inspection before generation, while the separate transcription tool and explicit-transcript instruction remain present.

- [x] G3: A regression check locks down the optional-transcript thumbnail behavior.
  CHECK: node --test tests/jarvis-thumbnail-credit-regression.test.mjs
  EXPECT: pass 2
  EVIDENCE: The command passed both regression assertions.

- [x] G4: Existing thumbnail schema behavior remains intact and the project typechecks.
  EVIDENCE: `node node_modules/tsx/dist/cli.mjs --test tests/jarvis-collaborator-thumbnail-aspect.test.ts` passed (3 tests); `node scripts/verify-typecheck.mjs` passed.
