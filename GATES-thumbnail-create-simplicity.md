# Gates: Thumbnail Create Panel Simplicity

OWNS: components/editor/thumbnail-studio/ThumbnailWorkspace.tsx, components/editor/thumbnail-studio/ThumbnailWorkspace.module.css

Scope: Simplify only the Thumbnail Studio Create panel while keeping core headline creation, optional refinements, generation, and post-generation actions available.

- [x] G1: The Create tab presents a clear headline input and primary action, with optional controls visually collapsed and secondary actions shown only when relevant.
  EVIDENCE: Manual source review confirms the headline remains the only always-visible Create control, refinements use a closed native disclosure, and export actions render only when generatedUrl exists.

- [x] G2: The simplification remains scoped to the inspector's Create tab and preserves available controls in their existing Styles and Brand destinations.
  EVIDENCE: Manual source review confirms the Create-only class and copy target the selected Create panel, while background, accent, references, and generation quality remain available in Styles or Brand.
