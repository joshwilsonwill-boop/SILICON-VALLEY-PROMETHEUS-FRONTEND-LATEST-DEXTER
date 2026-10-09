# Gates: thumbnail style repair

OWNS: components/editor/thumbnail-studio/ThumbnailWorkspace.module.css, components/editor/thumbnail-studio/ThumbnailWorkspace.tsx

Scope: Restore the styled Thumbnail Studio and explain the failure mechanism.

- [x] G1: The thumbnail UI source has a valid, applied style contract for the studio shell, layout, and aspect controls.
  EVIDENCE: `ThumbnailWorkspace.module.css` parses and contains `.studio`, `.window`, `.body`, `.aspectGroup`, and `.aspectButton`; `ThumbnailWorkspace.tsx` imports that module and now portals the styled root to `document.body`.

- [x] G2: The root cause and evidence are recorded, including any limits on direct visual verification.
  EVIDENCE: `app/editor/[id]/page.tsx` renders `ThumbnailStudioModal` inline at line 9746 beneath the viewport shell (`overflow-hidden` at lines 9380 and 9439); its `.studio` root relies on `position: fixed`. The supplied screenshot shows the studio constrained to the editor region. Portaling to `document.body` removes that ancestor constraint. No live browser session was attached, so visual post-change confirmation remains unavailable.
