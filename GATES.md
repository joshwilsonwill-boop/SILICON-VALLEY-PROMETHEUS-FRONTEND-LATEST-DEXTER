# Gates: Jarvis Autonomous Intelligence & Editorial Upgrade

OWNS: lib/autonomous-ui/**, lib/voice-companion/**, lib/exports/**, lib/server/**, hooks/use-voice-companion.ts, components/editor/**, components/navigation/**, app/api/**, tests/**

Scope: Upgrade Jarvis from repeated rigid animations to intelligent video-aware song curation, persistent memory across refreshes, automatic transcript and brand pre-briefing, honest filler-word/silence detection, multi-track timeline JSON document control, cinematic multi-track timeline with draggable text clips, and real Modal video treatment export pipeline.

- [x] G1: Intelligent song selection and search input dispatch in Music Studio
  CHECK: node tests/jarvis-song-intelligence-regression.test.mjs
  EXPECT: jarvis-song-intelligence-regression: all checks passed
  EVIDENCE: automatic-evidence=v1; definition-sha256=1ec01a3a1331f657ffa4413d3234563e6e7677661ddbf54dfd31d88b2b30f251; exit=0; EXPECT=matched; output-sha256=5e1e192430a55463981c50c1e81deb7826586852868451a46f4c26c940175171; output-bytes=615; shell=C:\Windows\system32\cmd.exe; cwd=C:\Users\HomePC\Documents\THE FRONT END, PROMETHEUS; path=86e75c2a2287/32 entries

- [x] G2: Persistent memory mapping layer for user brand and project editorial decisions across refreshes
  CHECK: node tests/jarvis-persistent-memory-regression.test.mjs
  EXPECT: jarvis-persistent-memory-regression: all checks passed
  EVIDENCE: automatic-evidence=v1; definition-sha256=727d8e4eb28d986ea867fc6737c5c2e0b930c2b691a0ee58962c3728a01114f5; exit=0; EXPECT=matched; output-sha256=04534daef92b4206a78d2c0a1b5672ed0a841327e03af8e02d0f095e80dacd85; output-bytes=606; shell=C:\Windows\system32\cmd.exe; cwd=C:\Users\HomePC\Documents\THE FRONT END, PROMETHEUS; path=86e75c2a2287/32 entries

- [x] G3: Video transcript and brand profile pre-briefing before Jarvis is summoned
  CHECK: node tests/jarvis-transcript-prebriefing-regression.test.mjs
  EXPECT: jarvis-transcript-prebriefing-regression: all checks passed
  EVIDENCE: automatic-evidence=v1; definition-sha256=4c18c6054ad122c2f1f170c655a9bb9879875aa19767d3bbdeb6d48c507180f5; exit=0; EXPECT=matched; output-sha256=c5f8b0dd26f4cdd529d412c89224bc81cbe2f0347b9965923a541ef81fdcd6b0; output-bytes=118; shell=C:\Windows\system32\cmd.exe; cwd=C:\Users\HomePC\Documents\THE FRONT END, PROMETHEUS; path=86e75c2a2287/32 entries

- [x] G4: Accurate filler-word / silence detection and honest removal without deflection
  CHECK: node tests/jarvis-filler-word-silence-regression.test.mjs
  EXPECT: jarvis-filler-word-silence-regression: all checks passed
  EVIDENCE: automatic-evidence=v1; definition-sha256=3188de43f879263d1e9ab455a7c6bc2389a2ceba292b10b6a49f65f6fa727020; exit=0; EXPECT=matched; output-sha256=99a1adb69112bed17705c51920d809a7f93dd1f6d1e07f9cc611a13294108647; output-bytes=618; shell=C:\Windows\system32\cmd.exe; cwd=C:\Users\HomePC\Documents\THE FRONT END, PROMETHEUS; path=86e75c2a2287/32 entries

- [x] G5: Multi-track timeline as editable JSON document with active editorial plan execution
  CHECK: node tests/jarvis-timeline-json-editorial-plan.test.mjs
  EXPECT: jarvis-timeline-json-editorial-plan: all checks passed
  EVIDENCE: automatic-evidence=v1; definition-sha256=d2394a70bbd4ce8cedea11762be8585aa078c38e5a5bc94cccb03812d1e2f6fc; exit=0; EXPECT=matched; output-sha256=b8a90ef4201e866c58c578fd55e35f26be76e334443e464dadb458937754ac27; output-bytes=622; shell=C:\Windows\system32\cmd.exe; cwd=C:\Users\HomePC\Documents\THE FRONT END, PROMETHEUS; path=86e75c2a2287/32 entries

- [x] G6: Backend mini-runs alignment audit with read-only verification of backend pipeline contracts
  CHECK: node tests/jarvis-backend-alignment-audit.test.mjs
  EXPECT: jarvis-backend-alignment-audit: all checks passed
  EVIDENCE: automatic-evidence=v1; definition-sha256=b4c9b22fbcda6efba279230213b82ed69dd7c621cb6ee2f42b092b66453d3d18; exit=0; EXPECT=matched; output-sha256=2273e62066057a34a0af026135101ab3fd48bdbaf1723156ce9d4f1445d7b458; output-bytes=606; shell=C:\Windows\system32\cmd.exe; cwd=C:\Users\HomePC\Documents\THE FRONT END, PROMETHEUS; path=86e75c2a2287/32 entries

- [x] G7: Chunk-level transcript cutting and rapid phrase batching optimization
  CHECK: node tests/jarvis-chunk-transcript-cut-regression.test.mjs
  EXPECT: jarvis-chunk-transcript-cut-regression: all checks passed
  EVIDENCE: automatic-evidence=v1; definition-sha256=55e1b9da7a2913801eb4004e16336efbcf00bc01a6271b23b793294d4dd5f44f; exit=0; EXPECT=matched; output-sha256=96aabbf89b3318e245ec9345b39a3951813ffa17e2588e360f6741ed64da13de; output-bytes=619; shell=C:\Windows\system32\cmd.exe; cwd=C:\Users\HomePC\Documents\THE FRONT END, PROMETHEUS; path=86e75c2a2287/32 entries

- [x] G8: Music catalog tag/mood filtering, video mood extraction, and reliable preview playback
  CHECK: node tests/jarvis-music-playback-mood-regression.test.mjs
  EXPECT: jarvis-music-playback-mood-regression: all checks passed
  EVIDENCE: automatic-evidence=v1; definition-sha256=b111ddea2fa1da688b76ab3dd53b4588d324c1ffe47aeb692e0655901aa4c674; exit=0; EXPECT=matched; output-sha256=59cace77b6af5507003a6ed452a4eddea9e13ae834273c6905b4448f7603d560; output-bytes=621; shell=C:\Windows\system32\cmd.exe; cwd=C:\Users\HomePC\Documents\THE FRONT END, PROMETHEUS; path=86e75c2a2287/32 entries

- [x] G9: Cross-workspace persistent video awareness & cached frame continuity
  CHECK: node tests/jarvis-cross-workspace-video-context-regression.test.mjs
  EXPECT: jarvis-cross-workspace-video-context-regression: all checks passed
  EVIDENCE: automatic-evidence=v1; definition-sha256=3ff9a5c867624c4eb6b13c4f74e4d9a2434ae4b79680337243cc8607637748c4; exit=0; EXPECT=matched; output-sha256=59b103f4ed5110c9ee52352124dc1364259d05901a6c7b48bac13aa0c85724f7; output-bytes=131; shell=C:\Windows\system32\cmd.exe; cwd=C:\Users\HomePC\Documents\THE FRONT END, PROMETHEUS; path=86e75c2a2287/32 entries

- [x] G10: Interactive text and caption timeline clips with drag-to-shift and trim controls
  CHECK: node tests/timeline-interactive-text-clips.test.mjs
  EXPECT: timeline-interactive-text-clips: all checks passed
  EVIDENCE: automatic-evidence=v1; definition-sha256=2115fb89df2ccebcd35b1d515cbb4bedd20d3f0383940cc2f8183f4f2912e05c; exit=0; EXPECT=matched; output-sha256=bb61137ca35092372603499982b3302e5876664b87dc093cbbbfb2c73732cd52; output-bytes=613; shell=C:\Windows\system32\cmd.exe; cwd=C:\Users\HomePC\Documents\THE FRONT END, PROMETHEUS; path=86e75c2a2287/32 entries

- [x] G11: Cinematic multi-track timeline navigation and scrubbing synchronization
  CHECK: node tests/timeline-cinematic-multitrack-sync.test.mjs
  EXPECT: timeline-cinematic-multitrack-sync: all checks passed
  EVIDENCE: automatic-evidence=v1; definition-sha256=739bd0dace5efa484d3c3b5081275111842796474b52e382eace1bc122b58e9f; exit=0; EXPECT=matched; output-sha256=011ef1b39da3d81885d0240b414438ed0a87b17ada518269a1cf2a32f25eb2da; output-bytes=620; shell=C:\Windows\system32\cmd.exe; cwd=C:\Users\HomePC\Documents\THE FRONT END, PROMETHEUS; path=86e75c2a2287/32 entries

- [x] G12: Real Modal video treatment export pipeline dispatch and video state update
  CHECK: node tests/modal-export-treatment-pipeline.test.mjs
  EXPECT: modal-export-treatment-pipeline: all checks passed
  EVIDENCE: automatic-evidence=v1; definition-sha256=0bdd4d5f98b629d5468e8bacbaa91db35f2497f8d4d39a80e471d2e5af424958; exit=0; EXPECT=matched; output-sha256=e4ae86f6f87da5e9a5153c5a865292dae1bbfc056c762783f1b6dc4bbab61920; output-bytes=615; shell=C:\Windows\system32\cmd.exe; cwd=C:\Users\HomePC\Documents\THE FRONT END, PROMETHEUS; path=86e75c2a2287/32 entries

