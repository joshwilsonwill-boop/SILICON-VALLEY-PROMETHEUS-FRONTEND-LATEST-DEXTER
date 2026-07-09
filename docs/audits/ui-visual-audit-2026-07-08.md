# Prometheus UI Visual Audit
Date: 2026-07-08
Auditor: Codex

## Scope

This audit focused on visual quality, responsive behavior, unfinished UI, dead-end interactions, redundant copy, and progressive disclosure discipline across the current frontend.

Reference lens used during critique:

- Hide non-essential information until needed.
- Avoid cognitive overload in dense production surfaces.
- Prefer premium restraint over “more motion, more chrome, more copy”.

Skills applied:

- `systematic-debugging`
- `ui-ux-pro-max`

Not available in this session:

- `improve-codebase-architecture`

Equivalent architecture review was performed manually.

## Method

1. Reviewed route and component structure.
2. Searched the codebase for mocks, placeholders, scaffold copy, disabled states, and unfinished interactions.
3. Ran the app locally with temporary placeholder public Supabase values to get past the initial config crash.
4. Captured route screenshots and viewport metrics across desktop, tablet, and mobile.
5. Generated visual evidence screenshots with overflow/clipping flags.

Primary artifacts:

- Raw route sweep: `audit-artifacts/ui-audit-pass2/results.json`
- Annotated evidence screenshots:
  - `audit-artifacts/ui-audit-evidence/home-desktop.png`
  - `audit-artifacts/ui-audit-evidence/home-mobile.png`
  - `audit-artifacts/ui-audit-evidence/editor-motion-tablet.png`
  - `audit-artifacts/ui-audit-evidence/assets-mobile.png`
  - `audit-artifacts/ui-audit-evidence/analytics-mobile.png`
  - `audit-artifacts/ui-audit-evidence/pricing-desktop.png`

## Environment And Render Blockers

These are not just setup issues. They directly affect perceived product quality and hide real UI problems during local review.

### 1. App hard-crashes without public Supabase env
Severity: Critical

Evidence:

- `lib/supabase/config.ts`
- All major routes initially failed with: `Supabase auth is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY to .env.local.`

Impact:

- The app presents a generic failure shell instead of a graceful unauthenticated state.
- This blocks visual QA and makes the product feel broken before any real UI is seen.

### 2. Compact signup is visually present but functionally broken without Turnstile site key
Severity: High

Evidence:

- `components/auth/SignupForm.tsx:245`
- `components/auth/SignupForm.tsx:247`
- Route errors on `/signup` and billing redirect flow:
  - `[Cloudflare Turnstile] Invalid or missing type for parameter "sitekey"`

Impact:

- Compact auth shells render with a primary CTA that is disabled by default and backed by a broken captcha mount.
- This turns the premium auth experience into a dead-end.

### 3. Root layout cold-start cost is inflated by five Google font imports
Severity: Medium

Evidence:

- `app/layout.tsx:4`
- `app/layout.tsx:15`
- `app/layout.tsx:22`
- `app/layout.tsx:29`
- `app/layout.tsx:36`
- `app/layout.tsx:43`

Impact:

- First route compile was materially slower than necessary during local rendering.
- This increases perceived fragility on fresh loads and raises the chance of FOIT/FOUT-related polish loss.

## Verified Visual Findings

### 1. Home page style rails visibly overflow and clip at desktop and mobile
Severity: Critical
Routes:

- `/`
- Desktop and mobile both verified

Evidence:

- `audit-artifacts/ui-audit-evidence/home-desktop.png`
- `audit-artifacts/ui-audit-evidence/home-mobile.png`
- `components/video-upload-interface.tsx:1425`
- `components/video-upload-interface.tsx:1461`
- `components/video-upload-interface.tsx:1464`

Observed:

- The “style rail” marquee stretches far outside its visible container.
- Multiple style cards are partially visible or clipped at the viewport edge.
- The effect reads more like uncontrolled overflow than intentional cinematic motion.

Why it breaks premium quality:

- This violates the repo’s own “no primary object may visually clip unless intentionally masked” rule.
- The user sees a moving library before they understand the primary task.
- It increases cognitive load instead of supporting progressive disclosure.

Likely root cause:

- Very wide animated tracks inside `overflow-hidden` shells with insufficient safe bounds and no breakpoint-specific containment logic.

### 2. Home hero panel is doing too much at once
Severity: High
Route:

- `/`

Evidence:

- `components/video-upload-interface.tsx:2186`
- `components/video-upload-interface.tsx:2193`
- `components/video-upload-interface.tsx:2210`
- `components/LandingHeader.tsx:17`
- `components/LandingHeader.tsx:44`
- `components/LandingHeader.tsx:74`

Observed:

- The top of the page stacks a fixed header, hero title, upload actions, style controls, telemetry copy, clone/improve/reveal actions, and animated rails in one opening frame.
- The header also duplicates high-priority navigation emphasis on “Pricing” across desktop and mobile layouts.

Why it breaks premium quality:

- The user’s first screen is overloaded.
- The page violates the “hide non-essential information until needed” principle.
- The visual hierarchy is not calm enough for a premium studio entry point.

Recommendation category:

- Information architecture and hierarchy, not just spacing.

### 3. Pricing page watermark scale is oversized relative to content stage
Severity: Medium
Route:

- `/pricing`

Evidence:

- `audit-artifacts/ui-audit-evidence/pricing-desktop.png`
- `components/premium-pricing-plans.tsx:54`
- `components/premium-pricing-plans.tsx:58`

Observed:

- The giant `PROMETHEUS` background wordmark uses `w-[140vw]` and bleeds outside the composition.
- The section itself also reports clipping pressure in the screenshot metrics.

Why it breaks premium quality:

- The decorative layer competes with the paid conversion content.
- It feels loud rather than controlled.
- It adds visual weight without improving decision-making.

Progressive disclosure critique:

- Decorative branding is taking attention that should belong to the actual plan comparison.

### 4. Analytics mobile uses horizontally overflowing metric cards
Severity: Critical
Route:

- `/analytics?devAuthBypass=1`
- Mobile verified

Evidence:

- `audit-artifacts/ui-audit-evidence/analytics-mobile.png`
- `components/analytics/PrometheusAnalytics.tsx:244`
- `components/analytics/PrometheusAnalytics.tsx:250`

Observed:

- Key stat cards use `min-w-[15rem]` inside a horizontal scroller.
- On mobile, “Watch time” visibly overhangs beyond the viewport.
- Early KPI comprehension depends on horizontal swiping, not immediate scanability.

Why it breaks premium quality:

- Core numbers should not begin in an overflowed carousel on the smallest viewport.
- The user has to work to see basic information.
- This is directly opposite to progressive disclosure; it hides essential data while still showing too much chrome.

### 5. Asset library mobile has severe clipping and zero-width text containers
Severity: Critical
Route:

- `/assets?devAuthBypass=1`
- Mobile verified

Evidence:

- `audit-artifacts/ui-audit-evidence/assets-mobile.png`
- `components/assets/cinematic-library.tsx:135`
- `components/assets/cinematic-library.tsx:255`
- `components/assets/cinematic-library.tsx:302`
- `components/assets/cinematic-library.tsx:355`
- `components/assets/cinematic-library.tsx:370`
- `components/assets/cinematic-library.tsx:387`

Observed:

- The hero shell is visually dense before the user reaches the asset grid.
- The grid and card text produce multiple clipping/truncation flags.
- Several card text nodes were measured with `clientWidth: 0` in the audit output, which strongly suggests unstable layout behavior in the mobile composition.

Why it breaks premium quality:

- The surface tries to behave like a cinematic showcase and a dense library at the same time.
- Mobile loses clarity first: decorative atmosphere remains, readable inventory structure weakens.

Progressive disclosure critique:

- The hero treatment should compress on mobile so the browsing task becomes the focal action.

### 6. Motion editor canvas is oversized and visually unsafe at tablet
Severity: Critical
Route:

- `/editor/motion?devAuthBypass=1`
- Tablet verified

Evidence:

- `audit-artifacts/ui-audit-evidence/editor-motion-tablet.png`
- `app/editor/motion/components/motion-canvas.tsx:141`
- `app/editor/motion/components/motion-direction-dial.tsx:100`
- `app/editor/motion/components/motion-direction-dial.tsx:120`
- `app/editor/motion/components/motion-direction-dial.tsx:161`
- `app/editor/motion/components/motion-direction-dial.tsx:221`

Observed:

- The canvas uses a fixed `h-[1800px] w-[2600px]` interaction plane.
- The tablet pass flagged multiple off-screen nodes and decorative layers.
- The bottom motion dial is visually rich but text-heavy and space-hungry.

Why it breaks premium quality:

- The canvas reads as technically ambitious but spatially under-controlled.
- The dial combines long explanatory prose, tabs, a budget control, reference upload, probe search, suggestions, and output chips in one chamber.
- This is one of the clearest examples of “too much visible at once”.

Reference-lens critique:

- This section needs staged disclosure more than it needs more ornament.

### 7. Motion editor has a real hydration mismatch
Severity: High
Route:

- `/editor/motion?devAuthBypass=1`

Evidence:

- Hydration mismatch captured in route audit output
- `app/editor/motion/components/node-types/image-settings-node.tsx:58`
- `app/editor/motion/components/node-types/image-settings-node.tsx:62`
- `app/editor/motion/components/motion-direction-dial.tsx:45`
- `app/editor/motion/components/motion-direction-dial.tsx:259`

Observed:

- Server/client HTML mismatch is being emitted during render.
- The mismatch includes range styles and input-related attributes.

Why it matters for UI:

- Hydration mismatches frequently cause flicker, focus instability, visual snapping, and “something feels off” motion defects.
- This is especially risky in a motion-heavy editor where visual trust is everything.

### 8. Billing route is a dead-end redirect chain for unauthenticated users
Severity: High
Route:

- `/billing?devAuthBypass=1`

Evidence:

- `app/billing/page.tsx:4`
- Final audited URL becomes `/signup?next=%2Fsettings%2Fbilling`

Observed:

- Billing is not a usable billing surface when entered directly.
- It redirects to settings billing, which then pushes the user into compact signup.

Why it breaks premium quality:

- The route reads as navigable product surface but behaves like a trapdoor.
- This is not a broken button, but it is a broken path.

## Unfinished, Scaffolded, Or Misleading UI Surfaces

These are product-facing areas that still present mock or placeholder behavior strongly enough to affect trust.

### 1. Team page is explicitly scaffold-only
Severity: High

Evidence:

- `app/team/page.tsx:15`
- `app/team/page.tsx:20`
- `app/team/page.tsx:24`

Observed copy:

- `UI-only team management scaffolding.`
- `Invite, roles, permissions (mock).`
- `This is a placeholder for team collaboration flows.`

### 2. Settings page exposes mock controls as if they are product settings
Severity: High

Evidence:

- `app/settings/page.tsx:55`
- `app/settings/page.tsx:67`
- `app/settings/page.tsx:68`
- `app/settings/page.tsx:81`
- `app/settings/page.tsx:87`
- `app/settings/page.tsx:97`
- `app/settings/page.tsx:104`

Observed copy:

- `Mock toggles for future alerts.`
- `UI-only. Respects system preference by default.`
- `Mock connect states.`
- `Connect to import sources.`
- `Connect publishing channels.`

Why it matters:

- These controls visually resemble live preferences.
- The user can reasonably interpret them as functional.

### 3. Editor entry is still mock-driven and redirect-heavy
Severity: High

Evidence:

- `app/editor/page.tsx`
- `app/editor/workspace/page.tsx`

Observed:

- Editor root is a silent redirect shell.
- It routes users either into a mock most-recent-project path or back to projects.
- In audit conditions it ultimately bounced into signup through downstream project behavior.

### 4. Social posting, project search, and editorial helper areas remain mock-backed
Severity: High

Evidence:

- `docs/audits/editor-placeholder-audit.md`
- `app/editor/[id]/page.tsx`
- `lib/editorial-frame/mock-preview-api.ts`
- `lib/editorial-frame/mock-revisionable-regions.ts`

Observed themes:

- Mock URLs
- Mock caption drafts
- Mock project browser copy
- Mock revision queue
- Mock editorial regions

Why it matters:

- These areas may look polished enough to be mistaken for production.
- That makes them more dangerous than visibly unfinished wireframes.

## Buttons, CTAs, And Interaction Quality Risks

### 1. Auth primary CTA can render disabled with no successful completion path
Severity: High

Evidence:

- `components/auth/SignupForm.tsx:247`
- `components/auth/SignupForm.tsx:259`

Observed:

- `Create account` is disabled until captcha resolves.
- The captcha component itself fails without a site key.

### 2. Team and settings surfaces contain production-looking controls attached to mock states
Severity: High

Evidence:

- `app/team/page.tsx`
- `app/settings/page.tsx`

Observed:

- The issue is less “button does nothing” and more “button/control looks live but belongs to scaffolding”.

### 3. Billing path is discoverable but not usable from direct entry
Severity: High

Evidence:

- `app/billing/page.tsx:4`

Observed:

- This is a navigation affordance problem and a trust problem.

## Redundant, Overwritten, Or Over-Explained Copy

### 1. Motion direction dial is over-written
Severity: High

Evidence:

- `app/editor/motion/components/motion-direction-dial.tsx:120`

Observed:

- The long explainer sentence is extremely dense and competes with the actual controls.

Why it matters:

- Premium interfaces explain with structure first, copy second.
- This section needs less narration and more progressive reveal.

### 2. Home hero competes with itself
Severity: Medium

Evidence:

- `components/video-upload-interface.tsx:2193`
- `components/video-upload-interface.tsx:2210`

Observed:

- The page sells multiple concepts simultaneously: upload, style, reveal, clone, improve, motion, source retention, and rail previews.

### 3. Settings and team copy exposes implementation truth instead of product framing
Severity: Medium

Observed:

- Words like `mock`, `UI-only`, and `placeholder` are useful internally but weaken trust when user-visible.

## Icons And Asset Quality Concerns

These are not all “bad assets”, but they are the places where asset quality currently reads below premium.

### 1. Home style preview rail feels duplicated and repetitive
Severity: Medium

Evidence:

- Home route metrics show repeated style cards and repeated rail lanes.
- `components/video-upload-interface.tsx` style rail region around lines `1461-1464`

Observed:

- Repetition makes the gallery feel synthetic rather than curated.

### 2. Asset library mobile avatar/hero treatment dominates the browsing job
Severity: Medium

Evidence:

- `components/assets/cinematic-library.tsx:255`
- `components/assets/cinematic-library.tsx:355`
- `components/assets/cinematic-library.tsx:370`

Observed:

- The visual language is attractive, but the hero art and preference-save layer are too strong relative to the actual library utility on mobile.

### 3. Pricing page decorative branding is visually louder than the plan signal
Severity: Medium

Evidence:

- `components/premium-pricing-plans.tsx:58`

## Pages That Most Need Human Creative Review

These are the areas where a user/product owner should review intent before fixes, because some issues may be intentional mood choices that only need tightening, not removal.

### 1. Home page

Review:

- Whether the animated style rails are meant to feel editorial or purely utilitarian
- Whether clone/improve/reveal belong above the fold
- Whether the header should remain this prominent over the hero

### 2. Motion editor

Review:

- Which parts of the motion dial are essential on first paint
- Which controls should collapse behind tabs, drawers, or staged reveals
- Whether the prose tone matches the intended seriousness of the tool

### 3. Asset library

Review:

- Whether this should feel like a cinematic moodboard or a working media browser
- How much of the “Alex archive” personality layer should remain on mobile

### 4. Analytics

Review:

- Whether KPI cards should prioritize instant scanability over atmospheric horizontal presentation

## Progressive Disclosure Scorecard

### Stronger alignment needed

- Home page
- Motion editor
- Asset library
- Settings

### Partial alignment

- Login
- Signup shell
- Pricing

### Best current alignment in audited set

- Team page structurally simple, but only because it is mostly placeholder content

## Recommended Fix Order Later

This is not implementation work yet. It is the safest order when we start treatment.

1. Remove route-level blockers that prevent trustworthy visual QA.
2. Fix hard responsive defects and clipping on Home, Analytics mobile, Assets mobile, Motion tablet.
3. Reduce information density on Home and Motion before polishing visuals.
4. Replace mock/scaffold copy on Team, Settings, editor-adjacent mock flows.
5. Clean hydration mismatches and auth-shell dead-end states.

## Bottom Line

The codebase already contains several visually ambitious surfaces, but the current UX quality is being dragged down by four repeating patterns:

1. Too much visible at once.
2. Decorative motion outranking task clarity.
3. Real responsive clipping in flagship surfaces.
4. Production-looking scaffolding that still behaves like mocks.

The most important thing to protect during the future fix pass is intent. Some of these screens are not bad because they are bold; they are bad because they are bold without enough containment, hierarchy, and disclosure control.
