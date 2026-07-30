# MAUL 2 First Slice: Editorial Cinema Design

**Date:** 2026-07-30  
**Status:** Draft for user review  
**Parent plan:** `docs/plans/MAUL-2-INTERMEDIATE.md`

## Objective

Complete the existing MAUL sequence from M0 through M2-1 while establishing a distinctive, reusable motion language for Prometheus. The experience must feel minimalist and editorial rather than like a generic dark SaaS interface.

The governing visual rule is: **one choreographed focal entrance, then silence and precise micro-response.**

## Scope

This slice includes:

1. M0 design-token and motion foundations.
2. M1-1 editor rail stacking fix.
3. M1-2 chat-history load failure handling and regression coverage.
4. M1-3 project rename affordance and visible-name propagation audit.
5. M2-1 four contextual chat suggestion chips on desktop and mobile.
6. A reusable typographic entrance primitive integrated only where this slice has a true focal heading or meaningful structural transition.

This slice excludes M2-2 carousel, the Library, Settings, Profile, Export, and Brand Brain work. Those follow sequentially after this slice passes its validation gates.

## Art Direction

### Editorial Cinema

- Fully dark, near-monochrome materials using the existing Prometheus tokens.
- Existing cyan remains a narrow state and affordance accent, not a decorative field.
- Elegist is the primary editorial display voice. Vogue is reserved for sharper editorial transitions.
- Inter remains the interface and body face.
- No decorative gradient fields, glow blobs, nested glass cards, oversized radii, or ambient motion without structural meaning.
- Spatial rhythm follows the existing 8/12/16/24/32 scale and the chamber rules in `docs/CINEMATIC_INTERFACE_SYSTEM.md`.

### Motion Hierarchy

The motion system has two typographic variants:

1. **Measured Reveal, default:** glyphs rise through a shared mask with a restrained focus settle. Use for true hero headings and designed empty states.
2. **Editorial Hard Cut, secondary:** crisp masked glyph entry with a controlled contrast inversion or edit line. Use only for decisive workspace or mode transitions.

Motion constraints:

- Entry motion plays once per meaningful mount or structural state change.
- Ordinary labels, body copy, repeated rows, and frequently updated values do not animate letter by letter.
- Stagger is approximately 20-26 ms per grapheme, capped so long headings do not become slow.
- Structural easing uses `cubic-bezier(0.22, 1, 0.36, 1)`; interactive easing uses `cubic-bezier(0.16, 1, 0.3, 1)`.
- No more than three simultaneous motion layers in a view.
- Reduced-motion users receive the final text immediately with identical layout and hierarchy.

## Component Design

### `CinematicTextReveal`

A new focused component owns editorial text choreography.

Proposed interface:

```ts
type CinematicTextRevealProps = {
  children: string
  as?: "h1" | "h2" | "h3" | "p" | "span"
  variant?: "measured" | "hard-cut"
  className?: string
  once?: boolean
}
```

Implementation requirements:

- Segment visible text with `Intl.Segmenter` when available and a code-point fallback otherwise.
- Expose the complete string once to assistive technology.
- Mark animated glyph wrappers `aria-hidden="true"`.
- Preserve spaces and wrapping without introducing layout shift.
- Use the existing Framer Motion dependency and consolidated motion tokens.
- Avoid adding a new animation dependency.

### Editor Rail

- Preserve the collapsed rail and header interaction.
- Use the new z-index contract from the token layer.
- Expanded rail covers the command island; collapsed rail leaves it fully usable.
- Motion remains a restrained width/material transition and honors reduced motion.

### Chat History

- Preserve the existing session and message APIs.
- A selected session either loads successfully or renders an explicit inline failure state with Retry and a toast.
- Never clear the visible thread before a replacement session has loaded successfully.
- Retry the legacy schema without `client_message_id` only for the known missing-column errors.
- Other errors propagate to the explicit failure surface.

### Rename Affordance

- Keep the existing PATCH flow and title state.
- Add a quiet hover/focus highlight, pencil icon, and tooltip around the editable project name.
- Do not animate the project title letter by letter during editing.
- Audit visible title consumers so a successful rename propagates without another network request.

### Chat Suggestions

- Render exactly four equal-weight suggestions above the composer.
- Desktop uses one row; compact layouts use a stable 2x2 grid.
- Suggestions derive deterministically from workspace tab, project presence, and recent conversational context.
- Selection prefills the existing draft; the user still sends explicitly.
- Hover uses edge definition and a maximum 1-3 px lift. Press uses a short, dense spring.
- Buttons remain at least 44 px high with visible keyboard focus.

## Data Flow And Contracts

No new backend contract is introduced in this slice.

- Chat history continues through `selectSession` -> `loadSessionMessages` -> `getChatMessages`.
- Suggestion selection calls the existing draft setter.
- Rename continues through the current project PATCH route and existing local title state.
- `CinematicTextReveal` is presentational and has no data dependencies.

Existing hook return shapes, component contracts, and API paths remain compatible. Any additive props must be optional with current behavior as the default.

## Error Handling

- Chat load failures are visible, recoverable, and never represented as an empty successful thread.
- Missing `client_message_id` receives one legacy-compatible retry; no broad error swallowing is allowed.
- Motion and font loading failures degrade to static readable text.
- Reduced-motion and unsupported `Intl.Segmenter` paths are first-class fallbacks.

## Performance And Accessibility

- No new runtime dependency.
- Transform, opacity, clip-path, and tightly bounded blur are the only animated properties; blur is limited to focal entrance text.
- Route JavaScript may not increase by more than 30 KB gzipped without written justification.
- Text layout dimensions are stable before animation begins.
- Icon-only controls have accessible names and tooltips where the symbol is not self-evident.
- Keyboard order, focus rings, 44 px touch targets, and contrast gates from B-01 through B-10 apply.

## Verification

Each milestone is closed before the next begins.

1. Run the existing focused regression tests plus the chat-history and suggestion-chip regressions.
2. Run `npm run typecheck`, `npm run lint`, and `npm run build`.
3. Capture desktop and mobile visual proof for the rail, chat error/retry state, rename affordance, and suggestion chips.
4. Capture normal-motion and reduced-motion states for `CinematicTextReveal`.
5. Check keyboard traversal and focus visibility.
6. Review route bundle delta against the 30 KB budget.
7. Review the final diff for API compatibility, unintended deletions, mock copy, hardcoded colors, and user-owned changes.

## Acceptance Criteria

- M0, M1-1, M1-2, M1-3, and M2-1 meet their parent-plan acceptance criteria.
- The typography primitive has measured and hard-cut variants, correct grapheme segmentation, and a static reduced-motion path.
- The first slice contains no generic decorative motion or newly invented palette.
- Existing editor, chat, and rename workflows remain functional.
- Required tests, typecheck, lint, and build pass or any pre-existing failure is isolated and documented without being misrepresented as introduced by this slice.
