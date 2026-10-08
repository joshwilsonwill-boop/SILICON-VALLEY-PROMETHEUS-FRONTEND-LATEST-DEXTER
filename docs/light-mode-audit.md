# Light-mode refinement audit

Scope: visual styling on `codex/light-mode-refinement`, based on the existing Settings preview (`9e2fb87`). No production promotion, main push, API changes, navigation changes, dependency additions, or layout redesign are part of this patch.

## Findings and root cause

Theme state was already propagated correctly. The Zustand preference store and `ThemeInjector` set CSS variables, `html[data-color-mode]`, and the dark class. Portals inherit the root variables. Introducing another provider would not fix the omissions.

Projects renders `ProjectsPageEditorial`, which bypassed those variables with `#09090b`, black tiles, white labels, an opaque black hero wash, and white/black hover inversion. The old compatibility stylesheet recognised `#09090c` but missed `#09090b`; its limited list also missed many dark neutrals in other pages. Fixing the legacy Projects component would not fix the served page.

Other recurring omissions were dark gradients in shared panels, dark inline drawer/toast styles, a toaster locked to `theme="dark"`, and a separate thumbnail workspace palette. Static surfaces also combined large shadows, inset highlights, hover glows, and pseudo-element sheen. These effects communicated similar prominence for ordinary content and true overlays.

## Existing palette retained

| Role | Existing light token/value |
| --- | --- |
| Page canvas | `--theme-background`: `#F6F7FB` |
| Primary surface | `--theme-surface`: `#FFFFFF` |
| Subtle surface | `--theme-surface-elevated`: `#EDF0F5` |
| Primary text | `--theme-foreground`: `#182230` |
| Secondary text | `--muted-foreground`: `#526174` |
| Dividers | `--theme-border`: `rgba(24,34,48,.16)` |
| Interactive accent | Existing selected theme's light accent |

Light-only `--light-ui-*` aliases reuse this palette. Legacy components can consume these aliases with their exact old dark value as the fallback. No theme preset or preference behavior was changed.

## Elevation and coverage decisions

The source inventory scanned 465 TSX/CSS files under `app`, `components`, and `styles`, including 37 page entry points. This is a source inventory, not a claim that every state was rendered. The following recurring treatments were reviewed in source:

| Area | Treatment |
| --- | --- |
| Studio, navigation and masthead | Shared canvas/surfaces; ordinary panel shadows removed. Sidebar cutout shadows retained as shape masks, with a light surface color. No navigation geometry changed. |
| Projects | Semantic canvas, tile, option, text and line variables; light hero wash/grain/glow removed; tile shadows removed; subtle hover surface retained; action menu keeps overlay elevation. Filtering, sorting, opening, duplication and deletion preserved. |
| Editor chrome, timeline and motion panels | Legacy neutral utility coverage and shared panel styles follow root theme; keyboard focus retains rings and gains a visible accent outline. Video stage remains intentionally dark. Timeline selection and media effects are not blanket-filtered. |
| Thumbnail workspace | Local toolbar, header, inspector, inputs, footer and text use the same aliases. Error/success and filled action states have readable light colors. Artboard, reference artwork, crop guides and render-oriented media styling preserved. |
| Analytics | Legacy neutral labels and backgrounds follow the common palette; ordinary content shadows removed. Chart series colors preserved. Video thumbnails and image-backed featured signal overlays retain their intentional media treatment. |
| Brand and asset libraries | Shared neutral surfaces and labels respond to light mode; cinematic library artwork/hero overlays preserve their media presentation. Brand swatches and authored media colors are unchanged. |
| Settings | Existing structure, spacing, utilities, behavior and palette preserved. A reference attribute excludes its subtree from new content/elevation refinements and restores its prior glass/focus tokens. |
| Dialogs, menus, sheets, drawers and toasts | Small menu elevation and larger dialog elevation retained; scrims stay dark. Drawer and toast inline colors consume aliases. Toast mode follows the existing store. |
| Other routes and nested legacy UI | Common neutral utilities use case-insensitive token matches; only actual hover classes receive state adapters. Saturated brand values are excluded from the neutral mapping. No typography, size, grid, spacing or breakpoint rules were added to the shared light stylesheet. |

There are three intentional depth levels: static content (`none`), menus/toasts (`--light-ui-menu-shadow`), and dialogs (`--light-ui-dialog-shadow`). Positioned overlays are exempt from the static shadow reset. Tailwind ring and inset-ring layers remain available; the reset removes decoration rather than keyboard focus. Backdrop blurs on ordinary glass content are removed; genuine overlay blurs remain.

## Preservation evidence

Automated source comparisons against `9e2fb87` check unchanged callbacks, routing, JSX structure and responsive/motion utilities for the affected page/media/reference components. The thumbnail CSS is parsed and compared after resolving light-only aliases to their dark fallbacks: every original declaration must match, including layout and breakpoints. Negative controls prove these checks detect spacing and routing changes.

Tailwind itself compiles the new Projects utilities in the regression test, checking that variables produce background, text and border colors, including opacity modifiers and hover styling. All shared adapter selectors are restricted to light mode. Existing preference persistence, denied-storage behavior, consent handling, theme switching, all theme presets, workspace back navigation and preview auth-origin behavior are covered by the regression checks.

## Validation status

Validation commands and their final results are recorded below before handoff. Rendered acceptance is still pending: Computer Use stopped this turn because it could not identify the current Windows browser URL confidently enough to enforce its policy. No replacement browser path or authentication bypass was used. This patch must not be described as visually accepted or promoted to production on the strength of source checks.

| Check | Result |
| --- | --- |
| `node tests/light-mode-refinement.test.mjs` | Passed; real Tailwind compilation, semantic colors, light-only scope and all preset contrast checks |
| `node tests/light-mode-regression.test.mjs` | Passed; actual preference store/injector/selector, persistence and mode restoration |
| `node tests/team-workspace-navigation.test.mjs` | Passed |
| `node tests/auth-preview-origin.test.mjs` | Passed |
| Original-source preservation oracle | Passed, including negative controls for routing and spacing |
| Lint on the 12 affected TSX/test files | Zero errors; two existing image warnings, checked against the original source |
| `npm run lint` | Three existing errors and 72 warnings. Error files: `app/editor/components/mobile-video-player.tsx` (two hook immutability errors) and `components/editor/LiquidCarveButton.tsx` (ref access during render). Both files are unchanged from the baseline. |
| `npm run typecheck` | Passed |
| `npm run build` | Passed with telemetry disabled and access to the existing Google Fonts. Final repeat passed; emitted CSS contains the final hover/focus adapters and semantic elevation aliases. Production bypass guards passed before and after compilation. |
| Rendered light/dark and responsive review | Pending; browser policy confidence stop described above |

The local build emits existing missing R2/Redis configuration warnings. No storage, billing, export, authentication or other service actions were exercised as part of this visual audit.

## Files changed

- `app/light-mode.css`: shared light-only coverage, semantic aliases, elevation/focus rules and preservation exclusions.
- `components/projects/projects-page-editorial.tsx`: mode-aware project colors and semantic surface/elevation hooks.
- `components/editor/thumbnail-studio/ThumbnailWorkspace.module.css`: mode-aware local UI chrome with original dark fallbacks.
- `components/ui/app-toaster.tsx`: mode and semantic toast styling.
- `components/ui/dialog.tsx`: scrim/elevation hooks only.
- `components/ui/slide-drawer.tsx`: semantic inline surface/border colors only.
- `components/dashboard-sidebar.tsx`: light cutout color and navigation surface hooks only.
- `components/settings/settings-frame.tsx`: preservation attribute only.
- `components/editor/PreviewCanvas.tsx`: media preservation attribute only.
- `components/analytics/VideoPlatformGallery.tsx`: media preservation attribute only.
- `components/analytics/PrometheusAnalytics.tsx`: preservation attribute for image-backed featured media only.
- `components/assets/cinematic-library.tsx`: artwork preservation attribute only.
- `tests/light-mode-regression.test.mjs`: validate the allowed visual-only properties; lint-safe compiled-module naming.
- `tests/light-mode-refinement.test.mjs`: new theme/compiler/contrast regression checks.
- `docs/light-mode-audit.md`: audit decisions, verification and remaining review.

Required rendered review: Studio, Projects (empty/populated/loading/menu/dialog), editor controls and drawers, thumbnail workspace, Analytics, Brand/assets and Settings; light-to-dark-to-light switching; hover/focus/active states; desktop, tablet and phone widths. Check media overlays and any conditional third-party UI that source inventory cannot fully establish.

Known separate concerns: the repository's existing lint errors should be tracked independently of this visual patch. Deprecated stylesheets were inventoried but left untouched because they are not imported. The current production branch contains later unrelated editor/analytics commits; this isolated preview patch does not replace that production history.
