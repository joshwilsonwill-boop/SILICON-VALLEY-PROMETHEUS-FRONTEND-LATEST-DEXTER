# Gates: Jarvis Intentional Video Inspection & Dynamic Beat Navigation

OWNS: lib/voice-companion/gemini-live-client.ts, lib/voice-companion/session-controls.ts, hooks/use-voice-companion.ts, scripts/verify-jarvis-intentional-inspection.mjs, tests/jarvis-intentional-inspection.test.mjs

Scope: Transform Jarvis video inspection from a hardcoded 5-point timeline sweep into dynamic, intentional visual thinking that targets single parts, section-to-section ranges, or multiple narrative beats with visible thought signaling and playhead positioning.

- [x] G1: Gemini Live Client declares intentional inspect_video tool schema with timestamps, timeSec, startSec, endSec, frameCount, intent, and keepPosition
  CHECK: node scripts/verify-jarvis-intentional-inspection.mjs --gate G1
  EXPECT: G1_INTENTIONAL_SCHEMA_PASSED
  EVIDENCE: automatic-evidence=v1; definition-sha256=9ccde66d0a67049f243d198034dbe7e885d172d436a29641012a49167efddcc6; exit=0; EXPECT=matched; output-sha256=e2401a623e775513e278c7bc1951d8ce9b4f288cf918d3949826f0eb9960bee8; output-bytes=152; shell=C:\Windows\system32\cmd.exe; cwd=C:\Users\HomePC\Documents\THE FRONT END, PROMETHEUS; path=6148c563d008/34 entries

- [x] G2: inspectVoiceVideo inspects a single intentional part (timeSec) without full sweep and respects keepPosition
  CHECK: node scripts/verify-jarvis-intentional-inspection.mjs --gate G2
  EXPECT: G2_SINGLE_PART_PASSED
  EVIDENCE: automatic-evidence=v1; definition-sha256=0a855e8328867cdf828bab0ed7c73f402f36c7d458dbc4d97c77f75ef371c398; exit=0; EXPECT=matched; output-sha256=0658918a6cfc50e6c756adf4ff661ccbebd98b66f47bd34201fd36113939c94f; output-bytes=659; shell=C:\Windows\system32\cmd.exe; cwd=C:\Users\HomePC\Documents\THE FRONT END, PROMETHEUS; path=6148c563d008/34 entries

- [x] G3: inspectVoiceVideo inspects an intentional range from part to part (startSec to endSec) with step progress
  CHECK: node scripts/verify-jarvis-intentional-inspection.mjs --gate G3
  EXPECT: G3_RANGE_INSPECTION_PASSED
  EVIDENCE: automatic-evidence=v1; definition-sha256=9299b51e2f3919d5a40e098d98916615cecb0b2d8ef1ad69218ad7cd83a65228; exit=0; EXPECT=matched; output-sha256=a05870800c81852acc6b75383a816db988c29f7145933204b858a84662246502; output-bytes=658; shell=C:\Windows\system32\cmd.exe; cwd=C:\Users\HomePC\Documents\THE FRONT END, PROMETHEUS; path=6148c563d008/34 entries

- [x] G4: inspectVoiceVideo inspects multiple discrete parts (timestamps array) with intent labels
  CHECK: node scripts/verify-jarvis-intentional-inspection.mjs --gate G4
  EXPECT: G4_MULTIPART_INSPECTION_PASSED
  EVIDENCE: automatic-evidence=v1; definition-sha256=4c7f209ae7e84f52bfaeaad55541aaa667aacd809dd0573683b437933b6087bd; exit=0; EXPECT=matched; output-sha256=f54b7aa5ae62a9f0f1072d2e226eb42c047c1f29691c6ec33f7c2c2b38a4a7a2; output-bytes=666; shell=C:\Windows\system32\cmd.exe; cwd=C:\Users\HomePC\Documents\THE FRONT END, PROMETHEUS; path=6148c563d008/34 entries

- [x] G5: inspectVoiceVideo preserves backward compatibility when called without specific options
  CHECK: node scripts/verify-jarvis-intentional-inspection.mjs --gate G5
  EXPECT: G5_BACKWARD_COMPAT_PASSED
  EVIDENCE: automatic-evidence=v1; definition-sha256=10e7575b3db84c6d642b2dc1df60e5d74f83986845eb4850ec39bdb59afd8d11; exit=0; EXPECT=matched; output-sha256=814395db2a40070987df3ea49e611518b141edaf1123beb67ac4b6c7d88a473d; output-bytes=650; shell=C:\Windows\system32\cmd.exe; cwd=C:\Users\HomePC\Documents\THE FRONT END, PROMETHEUS; path=6148c563d008/34 entries

- [x] G6: useVoiceCompanion unpacks intentional parameters and binds onProgress live feedback
  CHECK: node scripts/verify-jarvis-intentional-inspection.mjs --gate G6
  EXPECT: G6_HOOK_FORWARDING_PASSED
  EVIDENCE: automatic-evidence=v1; definition-sha256=95c2541280f87e4b27755cae7bf09ab8ebb16bebcb5730130868a9dc48e5c03b; exit=0; EXPECT=matched; output-sha256=1f6b3e9dafff23689e4787e3b1a86e2a4ebfae4a81608f4490c3b1aa9e7157f6; output-bytes=142; shell=C:\Windows\system32\cmd.exe; cwd=C:\Users\HomePC\Documents\THE FRONT END, PROMETHEUS; path=6148c563d008/34 entries

- [x] G7: Dedicated test suite for intentional inspection passes with zero failures
  CHECK: node --import tsx --test tests/jarvis-intentional-inspection.test.mjs
  EXPECT: pass 6
  EVIDENCE: automatic-evidence=v1; definition-sha256=e549c98f14325fe264b06d1e75f6ac5877dc4c74bd14a8f6b090f5ecba9aa939; exit=0; EXPECT=matched; output-sha256=a938a364747f0908f74805e4bd5368c0e7143d66651ed3ea1a2a8804b0897528; output-bytes=676; shell=C:\Windows\system32\cmd.exe; cwd=C:\Users\HomePC\Documents\THE FRONT END, PROMETHEUS; path=6148c563d008/34 entries

- [x] G8: Existing voice companion and session runtime regression test suites pass without regression
  CHECK: node --import tsx --test tests/jarvis-session-runtime.test.mjs
  EXPECT: pass 12
  EVIDENCE: automatic-evidence=v1; definition-sha256=caf9be4ffa46e876b483866ab764aba51f1dcf340ed3be4f2e0763966cab4687; exit=0; EXPECT=matched; output-sha256=0c77ee7f90345e6d3d59baaf8772c05a81826d271221b604cf895c9ff605b4d3; output-bytes=1229; shell=C:\Windows\system32\cmd.exe; cwd=C:\Users\HomePC\Documents\THE FRONT END, PROMETHEUS; path=6148c563d008/34 entries
