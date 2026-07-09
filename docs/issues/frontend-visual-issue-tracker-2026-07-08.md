# Frontend Visual Issue Tracker
Date: 2026-07-08
Status: Local tracker because GitHub Issues are disabled for this repository.

## Source Inputs

User-provided references:

- Project section appraisal screenshot: `C:\Users\HomePC\AppData\Local\Temp\codex-clipboard-7c5087fe-067c-4bff-a3c1-0bee6fd3be9a.png`
- Editorial right-compartment screenshot A: `C:\Users\HomePC\AppData\Local\Temp\codex-clipboard-21a7425a-6559-4af1-bcca-9910c254f254.png`
- Editorial right-compartment screenshot B: `C:\Users\HomePC\AppData\Local\Temp\codex-clipboard-4bcef227-3408-490e-aa3a-002a79752ab2.png`
- Logo animation reference video: `C:\Users\HomePC\Downloads\THE LOGO ANIMATION.mp4`
- Extracted video reference frames: `audit-artifacts/references/logo-animation/frame-01.png` through `frame-06.png`

Reference video metadata:

- Codec: `h264`
- Size: `720x720`
- FPS: `30`
- Duration: `19.4s`
- File size: `626145` bytes

Located code anchors:

- Project cards: `app/projects/page.tsx`
- Editor frame compartment: `components/editor/liquid-frame-selector.tsx`
- Editor preview shell usage: `components/editor/InspectorPanel.tsx`, `components/editor/PreviewCanvas.tsx`
- Editor loading route: `app/editor/[id]/loading.tsx`
- Current shared editor loader: `components/editor/editor-loading-screen.tsx`
- Current infinity loader: `components/ui/minimal-typographic-loader.tsx`
- Prometheus transparent logo: `public/branding/prometheus-logo-no-bg.png`
- Prometheus chat logo usage: `components/editor/PrometheusChat.tsx`

## Sequence

1. `FE-UI-001`: Redesign project cards and remove the current radial/rotating hover behavior.
2. `FE-UI-002`: Remove the editorial chamber right-side frame selector compartment.
3. `FE-UI-003`: Replace editor loading states with the Prometheus logo shader animation system.

Do not combine these into one implementation pass. Each has different risk, verification needs, and visual intent.

## FE-UI-001: Replace Project Cards And Remove Radial Hover Treatment

Status: Ready for implementation
Priority: High
Type: Visual redesign
Primary route: `/projects`

### Problem

The current project grid cards feel visibly sub-premium. The user specifically called out the individual boxes as needing to be removed and rebuilt in entirety. The current hover behavior has a radial/rotating treatment that reads as cheap and distracting.

### Evidence

- User screenshot: `codex-clipboard-7c5087fe-067c-4bff-a3c1-0bee6fd3be9a.png`
- Current project-card skeleton: `app/projects/page.tsx:288`
- Current project-card implementation: `app/projects/page.tsx:989`
- Current preview card surface: `app/projects/page.tsx:1074`
- Current radial placeholder gradient: `app/projects/page.tsx:1098`
- Current version chevron rotation: `app/projects/page.tsx:1154`

### Design Direction

Replace the card architecture, not just tune colors.

Desired qualities:

- Premium, quieter project tiles.
- No radial spinning or rotating hover effect.
- Hover should be restrained: elevation, edge definition, subtle thumbnail clarity, and actionable controls.
- Cards should be stable under hover, with no layout shift.
- Card actions should not depend only on hover because touch devices cannot access hover reliably.
- Use thumbnails or clear static visual states where available.
- Empty thumbnail states should look intentional, not like a blurred placeholder blob.

### UX Principle

Progressive disclosure applies to actions. The default card should show project identity and status. Secondary actions may appear on focus/hover on desktop, but must remain discoverable on mobile through a menu or persistent affordance.

### Acceptance Criteria

- The current radial/rotating hover treatment is gone.
- Project cards are visually rebuilt as a cohesive card system.
- Desktop hover does not rotate, spin, flash, or create radial movement.
- Mobile cards expose actions without requiring hover.
- Cards remain readable at common desktop, tablet, and mobile widths.
- Text does not overlap badges, thumbnails, or action controls.
- `prefers-reduced-motion` keeps the card experience stable.
- Visual verification includes `/projects` desktop and mobile screenshots.

### Suggested Verification

- Run the app locally and inspect `/projects?devAuthBypass=1`.
- Capture desktop around `1440x900`.
- Capture mobile around `390x844`.
- Confirm no horizontal overflow and no clipped card metadata.

## FE-UI-002: Remove Editorial Chamber Right-Side Frame Selector Compartment

Status: Ready for implementation
Priority: High
Type: Layout removal/refactor
Primary area: Prometheus editorial chamber

### Problem

The right-side compartment containing:

- `16:9 Wide`
- `9:16 Vertical`
- `1:1 Square`
- `fill`
- `fit`
- `Import`

must be removed in entirety from the editorial chamber.

### Evidence

- User screenshot A: `codex-clipboard-21a7425a-6559-4af1-bcca-9910c254f254.png`
- User screenshot B: `codex-clipboard-4bcef227-3408-490e-aa3a-002a79752ab2.png`
- Component source: `components/editor/liquid-frame-selector.tsx`
- Ratio stop definitions: `components/editor/liquid-frame-selector.tsx:9`
- Fit/import controls: `components/editor/liquid-frame-selector.tsx:88`

### Design Direction

Remove the visual compartment, not merely hide one label.

Key constraint:

- Preserve underlying preview behavior only if other parts of the editor still depend on frame preset and fit mode state.

Likely implementation shape:

- Remove `LiquidFrameSelector` from the visible editorial chamber.
- Keep the underlying `PreviewFitMode` and `PreviewFramePreset` types if still used by preview rendering.
- If frame controls are still needed later, relocate them into a lower-priority menu, inspector drawer, or command flow instead of an always-visible right compartment.

### UX Principle

This control cluster is non-essential during primary editorial work. It adds cognitive load and makes the chamber feel crowded.

### Acceptance Criteria

- The referenced right-side frame selector compartment is not visible in the editorial chamber.
- The editor does not show `16:9`, `9:16`, `1:1`, `fill`, `fit`, or `Import` as that boxed cluster.
- Removing the compartment does not break source preview rendering.
- If source import still needs a path, it remains available through the correct upload/import flow elsewhere.
- The right-side chamber area visually reflows cleanly after removal.
- Desktop and mobile/tablet editor screenshots show no empty dead zone where the component used to sit.

### Suggested Verification

- Inspect the editor route that shows the screenshoted chamber.
- Confirm `components/editor/liquid-frame-selector.tsx` is either unused or no longer mounted in the chamber.
- Check console for no missing prop or state errors.

## FE-UI-003: Build Prometheus Logo Shader Loading Animation

Status: Needs technical design before implementation
Priority: High
Type: Motion system / loading state / brand animation
Primary routes:

- Navigation from `/projects` into editor/editorial routes
- `app/editor/[id]/loading.tsx`
- Shared editor loading states

### Problem

The current loading animation language is still centered on an infinity-style mark. The user wants that replaced with a shader-style animation applied to the actual Prometheus background-free logo.

### Evidence

- User-provided reference video: `C:\Users\HomePC\Downloads\THE LOGO ANIMATION.mp4`
- Extracted frames: `audit-artifacts/references/logo-animation/frame-01.png` through `frame-06.png`
- Current loading route: `app/editor/[id]/loading.tsx`
- Current editor loader wrapper: `components/editor/editor-loading-screen.tsx`
- Current infinity loader implementation: `components/ui/minimal-typographic-loader.tsx`
- Transparent logo asset: `public/branding/prometheus-logo-no-bg.png`

### Technical Decision Required

There are three realistic implementation paths.

Path A: Lightweight CSS/SVG mask shader

- Uses the logo PNG as a mask.
- Applies animated gradients, displacement-like filters, shimmer, blur, and controlled bloom.
- Best for fast load and low memory.
- Lowest risk.
- May not perfectly match advanced Unicorn/WebGL shader motion.

Path B: WebGL fragment shader over logo mask

- Uses WebGL or Three.js shader material.
- Can replicate refractive, liquid, metallic, particle, or scanline effects at much higher fidelity.
- Higher implementation and QA cost.
- Must include reduced-motion and low-device fallback.
- Must be lazy-loaded and isolated so editor navigation stays fast.

Path C: Pre-rendered transparent animation asset

- Generate a high-quality WebM/APNG/Lottie-like asset from the Prometheus logo and use it as the loader.
- Very reliable visual match if created externally.
- Lowest runtime complexity.
- Less flexible than a live shader.

### Recommendation

Start with Path A unless the visual target demands per-pixel refraction or complex dimensional distortion. If the goal is a truly top-notch replica of the supplied reference, use a short technical spike to decide between Path B and Path C.

If the human creates a Unicorn Studio version, accept that artifact and either embed it directly or use it as the visual target for a lighter in-repo replica.

### Performance Requirements

- Loader must appear quickly during editor navigation.
- No large runtime library should block editor route transition.
- WebGL path must be dynamically imported.
- Must respect `prefers-reduced-motion`.
- Must provide a static logo fallback.
- Must not pin a GPU-heavy animation in memory after loading completes.
- Must work on mobile without RAM/GPU spikes.

### Design Direction

The loader should feel like the Prometheus logo is being energized or materialized, not like an infinite loop symbol. The logo itself is the hero object.

Suggested behavior:

- Initial dark/quiet logo silhouette.
- Fast luminous sweep or refractive pass across the mark.
- Controlled bloom and edge definition.
- Optional micro-particles or shader noise contained inside/near the mark.
- Short loop or finite reveal, not a loud endless spinner.

### Acceptance Criteria

- Editor loading states use the actual Prometheus logo from `public/branding/prometheus-logo-no-bg.png`.
- Infinity loader is no longer used for editor/editorial navigation loading.
- The effect visually references `THE LOGO ANIMATION.mp4`.
- Reduced-motion users get a non-distracting static or minimal reveal state.
- Low-tier devices get a fallback that does not mount WebGL.
- No layout shift occurs when the loader appears.
- Loader is reusable for editor route loading and project-to-editor transition states.
- Visual QA includes desktop and mobile screenshots/video capture.
- Performance QA confirms no persistent heavy canvas after load.

### Suggested Verification

- Navigate from `/projects` into an editor project.
- Confirm the new logo loader appears during transition.
- Confirm there is no infinity mark.
- Inspect memory/performance while loader is active and after route resolves.
- Test with reduced motion enabled.

## Non-Goals For This Batch

- Do not redesign the whole editorial chamber yet.
- Do not fix every dashboard/UI audit finding yet.
- Do not rebuild analytics, assets, billing, settings, or team in this batch.
- Do not remove editor frame state globally unless verified unused.

## Notes From UI Skill Guidance

Relevant guidance from `ui-ux-pro-max`:

- Hover effects do not work on touch devices; important actions need tap/click access.
- Respect reduced motion.
- Excessive motion causes distraction; keep the animated focus narrow.

