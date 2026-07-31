# Elegist Chat Greeting Design

**Date:** 2026-08-01  
**Status:** Approved direction, pending written-spec review

## Decision

Use direction A, **Measured**, for the empty Prometheus chat greeting on desktop and mobile.

The greeting remains one centered sentence:

> What would you like to create, {USERNAME}?

The username completes the sentence in the same Elegist face and weight. It receives only a small luminance lift, not a separate size, badge, underline, accent color, or decorative treatment.

## Objective

Make the empty chat state feel editorial, personal, and restrained while guaranteeing that the visible display heading never flashes or settles into the application's base sans-serif font.

## Visual Design

- Use the repository's `elegist/Elegist.otf` as the only visible face for the greeting.
- Center the greeting horizontally and vertically in the available empty-thread space.
- Balance the sentence into two natural lines at desktop widths, with responsive wrapping on compact screens.
- Keep regular font weight, normal letter spacing, and a tight `0.90-0.96` line height suited to Elegist.
- Use near-white text at the existing `text-white/92` level. The username may render at full white for quiet emphasis.
- Add no card, glow, gradient, badge, rule, icon, or ambient decoration.
- Preserve the existing one-time measured reveal: a restrained rise and focus settle, followed by complete stillness.

## Component Design

Add a focused `ElegistChatGreeting` component that owns the empty-state typography and font-ready behavior.

Proposed interface:

```ts
type ElegistChatGreetingProps = {
  greeting: string
  className?: string
}
```

Responsibilities:

- Parse the existing greeting into the prompt and optional username without changing `getChatGreeting` or its auth/profile contract.
- Render one accessible heading string.
- Render the visible Elegist treatment only after the browser confirms that the local Elegist face is available.
- Delegate the one-time grapheme reveal to the existing `CinematicTextReveal` primitive.
- Provide the final static state immediately when reduced motion is requested.
- Share identical behavior between desktop and mobile chat call sites.

## Font Loading Contract

The global `next/font/local` declaration remains preloaded and uses `display: "block"`. Its fallback adjustment is disabled so the generated family does not imitate Elegist with a system sans-serif.

The visible greeting is initially present for layout and accessibility but visually withheld. After hydration, the component checks the Elegist face through the browser Font Loading API. Only a confirmed load reveals the display glyphs and starts the measured entrance.

If the Font Loading API is unavailable, the component trusts the preloaded local font and reveals normally. If the font reports a loading failure, the heading remains available to assistive technology and the component does not substitute the base UI face into the display treatment.

This contract is intentionally limited to the chat greeting. Body copy, controls, and messages continue to use the interface font.

## Responsive Behavior

- Desktop: maximum width near the existing `max-w-4xl`, with display size capped below the oversized screenshot treatment.
- Mobile: use the existing compact width and a stable clamp that keeps the longest username inside the viewport.
- No viewport-width JavaScript is introduced; wrapping and sizing remain CSS-driven.
- Long unbroken usernames may wrap at safe boundaries without overflowing the chat chamber.
- The composer and suggestion areas keep their current dimensions and position.

## Accessibility

- Preserve a single complete accessible heading rather than announcing animated glyphs individually.
- The font-loading visibility treatment must not use `display: none` on the accessible text.
- Honor `prefers-reduced-motion` through the existing reveal primitive.
- Maintain stable heading dimensions while the font is loading to avoid moving the composer or scroll viewport.

## Data And Error Boundaries

- Keep `getUserDisplayName` and `getChatGreeting` unchanged.
- Keep the generic `Creator` fallback behavior unchanged.
- Add no API, persistence, authentication, or profile changes.
- Add no runtime dependency.

## Verification

1. Add focused regression coverage for the strict Elegist declaration and shared desktop/mobile greeting component.
2. Verify the greeting uses the live username and the generic unauthenticated copy.
3. Verify the visual glyph layer is gated on font readiness while the accessible full string remains present.
4. Run the focused font-loading tests, typecheck, lint, and production build.
5. Inspect desktop and mobile empty chat states at normal and reduced motion.
6. Confirm computed `font-family` is Elegist and capture proof that no sans-serif frame appears during initial load.

## Acceptance Criteria

- Desktop and mobile empty chat states use direction A.
- The visible greeting is always Elegist; it never flashes or settles into the base UI font.
- The username remains dynamic and completes the sentence with restrained emphasis.
- The greeting stays minimalist, centered, responsive, and readable.
- Existing chat, composer, suggestion, history, auth, and profile behavior remains unchanged.
- Focused tests, typecheck, lint, and build pass, or unrelated pre-existing failures are clearly isolated.

## Self-Review

- The chosen composition, hierarchy, motion, loading behavior, responsive behavior, and fallback policy are explicit.
- No placeholder decisions, new dependencies, brand-color changes, or backend changes remain.
- The design is limited to the empty chat greeting and preserves existing user-owned worktree changes.
