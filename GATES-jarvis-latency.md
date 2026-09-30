# Gates: Jarvis turn latency and network resilience

OWNS: lib/voice-companion/gemini-live-client.ts, lib/voice-companion/audio-streamer.ts, lib/voice-companion/live-errors.ts, lib/voice-companion/transcript-search.ts, hooks/use-voice-companion.ts, tests/jarvis-live-latency-regression.test.mjs, tests/jarvis-latency-plan.test.mjs, docs/jarvis-latency-architecture.md, docs/jarvis-capability-gaps.md, GATES-jarvis-latency.md

Scope: Identify and fix verified Jarvis live-turn latency and reliability defects, reinforce the client/hook boundary, and document the resilient target architecture.

- [x] G1: Typed probes and incoming live messages preserve turn ordering without fixed transmission delays.
  CHECK: node tests/voice-companion-audio-pipeline.test.mjs
  EXPECT: Voice Companion & Chat Spoken Reply regression checks passed!
  EVIDENCE: automatic-evidence=v1; definition-sha256=5cf594a5a9d4dfc252e3712029b7ef30490de7bc14638bb7efda5dad3b8edcad; exit=0; EXPECT=matched; output-sha256=c093dae3269ef61e577b8b18ef2c0c6ebc02edc6d35b062051d03589800650b6; output-bytes=62; shell=C:\Windows\system32\cmd.exe; cwd=C:\Users\HomePC\Documents\THE FRONT END, PROMETHEUS; path=daf53fd1173d/38 entries

- [x] G2: The live client preserves event order and settles setup after timeout or premature socket close; connection errors remain visible.
  CHECK: node tests/jarvis-live-latency-regression.test.mjs
  EXPECT: jarvis-live-latency-regression: all assertions passed
  EVIDENCE: automatic-evidence=v1; definition-sha256=6c40fbf286ed6045eb729cf7570d9529fa65c4dbe6ba999419ed8de87633a476; exit=0; EXPECT=matched; output-sha256=25a929e3d4ffc60039d54abbc156a476daf157717014fcc48dde28d3f3087170; output-bytes=565; shell=C:\Windows\system32\cmd.exe; cwd=C:\Users\HomePC\Documents\THE FRONT END, PROMETHEUS; path=daf53fd1173d/38 entries

- [x] G3: A concrete latency and resilience architecture plan distinguishes immediate fixes from infrastructure follow-up.
  CHECK: node tests/jarvis-latency-plan.test.mjs
  EXPECT: jarvis-latency-plan: all assertions passed
  EVIDENCE: automatic-evidence=v1; definition-sha256=8b07eb4b628500cdd5c825da07c0827ec52f13cf410ef4ad945000f38f0a4bd3; exit=0; EXPECT=matched; output-sha256=5c9fc010fb4d3a03021ac8f8e34de6675ed33d5824e2d70661b3208959065afc; output-bytes=43; shell=C:\Windows\system32\cmd.exe; cwd=C:\Users\HomePC\Documents\THE FRONT END, PROMETHEUS; path=daf53fd1173d/38 entries

- [x] G4: The changed TypeScript integrates cleanly with the application.
  CHECK: npm run typecheck
  EXPECT: typecheck passed
  EVIDENCE: automatic-evidence=v1; definition-sha256=9aeeb689bde5257e0a85c8ecb0aad3fdaf9ace3e9e5076bbf6758c22760ccfe3; exit=0; EXPECT=matched; output-sha256=2c4af01fb1a5f9597841244575659986624ce8ada13bbc89dce9491fd48c4a46; output-bytes=93; shell=C:\Windows\system32\cmd.exe; cwd=C:\Users\HomePC\Documents\THE FRONT END, PROMETHEUS; path=daf53fd1173d/38 entries
