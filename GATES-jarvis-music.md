# Gates: Jarvis music control and video-aware recommendations

OWNS: lib/voice-companion/music-controls.ts, lib/voice-companion/bridge.ts, lib/voice-companion/gemini-live-client.ts, hooks/use-voice-companion.ts, app/editor/[id]/page.tsx, GATES-jarvis-music.md

Scope: Let Jarvis stop or mute soundtrack playback and use inspected video evidence to retain relevant semantic soundtrack recommendations.

- [x] G1: Music stop, mute, and unmute requests map to distinct editor actions and report only confirmed outcomes.
  EVIDENCE: Reviewed `performVoiceMusicAction` and the editor bridge. `stop` pauses preview and soundtrack playback, then confirms the soundtrack mute handler; `mute` and `unmute` call the separate mute handler and return its confirmed result. Missing handlers and unsuccessful outcomes return failure.

- [x] G2: Video-led music discovery inspects the source first and returns semantic recommendation results even without literal title matches.
  EVIDENCE: Reviewed the tool executor and music action path. Unnamed search/selection is rejected until `inspect_video` has sampled the current project's source asset; project changes invalidate that inspection. Semantic result lists survive without literal title matches, and `recommendation: true` stages the first ranked result.

- [x] G3: The music action tool and prompt describe the supported controls and require video inspection before video-led recommendations.
  EVIDENCE: Reviewed the Live tool enum/description and system instruction. They direct Jarvis to inspect before unnamed video-led recommendations, use visual observations in the query, distinguish exact-title requests, and route stop/mute/unmute to music controls. `git diff --check` passed. Typecheck and runtime checks were not run.
