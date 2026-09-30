# Gates: editor captions and contextual soundtrack selection

OWNS: components/editor/cinematic-preview-runtime.tsx, components/editor/music-tab-panel.tsx, app/editor/**, lib/types/index.ts

Scope: Preserve complete spoken and prompted text, place overlays in the selected safe region, keep music selection explicit, and rank candidate music using the available source video context.

- [x] G1: Long overlay text is rendered in full without a fixed character truncation or repeated content.
  EVIDENCE: Removed the 76-character prompt slice; preview renders cue.text once and wraps it.

- [x] G2: Caption placement honors cue safe regions and per-cue layout settings, with a fallback when no tracking data exists.
  EVIDENCE: Renderer maps upper/lower, center, panel, and full-frame regions; bottom padding and max width are clamped. Default remains safe-lower-third when no cue-specific alternative is supplied.

- [x] G3: No soundtrack is selected just because it is first; contextual recommendations remain visible and the user makes the final selection.
  EVIDENCE: First-track defaults and fallback selection are removed; the For this video collection is initially shown and track selection still occurs in explicit focus/activate handlers.

- [x] G4: Music matching receives video pace and contextual signals when available.
  EVIDENCE: Music panel posts videoContext and initialPrompt; desktop and mobile callers provide both.

- [x] G5: Existing user's in-progress editor changes are preserved.
  EVIDENCE: Existing unrelated editor/music styling and preview-audio hunks remain unchanged; GATES.md has no diff.

- [ ] G6: Automatic per-frame mouth tracking follows the speaker through movement and camera changes.
  EVIDENCE: pending

- [ ] G7: Model choice and editing retain the preceding workflow context and intended subject.
  EVIDENCE: pending
