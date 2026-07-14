# Frontend Audit - Issue Tracker

**Date:** 2026-07-14  
**Auditor:** Codex Agent  
**Commit:** `4ed607e4f7ee1244f1348a3cff365238dce11b14`

---

## Audit Evidence And Limits

The app was rendered locally with `npm run dev` at 1440x900 and 390x844. Public and unauthenticated flows were exercised in Chromium. Protected routes consistently redirected an unauthenticated browser to `/signup?next=...`; their authenticated UI is therefore explicitly **UNVERIFIED - requires auth**, not inferred from source.

The dev server later became CPU-saturated while compiling route sweeps and exited during additional public-route requests. That is recorded below as a reliability concern; pages not reached before the exit are not represented as rendered.

Supporting captures are in [`docs/audit-screenshots/`](audit-screenshots/), notably `mobile-home.png`, `mobile-login.png`, `mobile-signup.png`, `desktop-signup.png`, and `desktop-home-send-empty.png`.

---

## P0 - Ship Blockers (fix before launch)

### P0-001: The authenticated upload-to-export workflow has no release-validation path
- **Page:** `/projects`, `/editor/[id]`, `/settings`, `/billing`, and the requested mobile editor routes
- **Issue:** All protected URLs redirected to signup in the audit browser. No test account, seeded project, or supported local auth fixture was available, so project creation, source upload, timeline editing, subtitles, preview, music, export progress, final render, download, data persistence, expired-session recovery, and billing data could not be rendered or tested.
- **Impact:** The app's core job cannot be certified before launch. A failure in any one of these functions would be a ship blocker and is currently unobservable in automated release verification.
- **Repro:** Start the local app with no Supabase session; open any protected route, for example `/projects` or `/editor/audit-project`; observe the final location `/signup?next=...`.
- **Suggested Fix:** Provide a non-production audit account plus documented seed/reset steps, or an approved local auth/data fixture that exercises a project with a source asset and a completed export. Add an end-to-end smoke test covering upload -> edit -> export -> download with a deterministic fixture.
- **Effort:** M

### P0-002: Runtime route sweep destabilizes the local frontend server
- **Page:** `/settings`, `/studio`, and additional routes reached during the full sweep
- **Issue:** After route compilation and browser inspection, `/settings` and `/studio` returned no bytes within 12 seconds. While continuing bounded checks, the `next dev --webpack` server exited; subsequent requests returned connection resets/refusals. This was reproduced only in the audit environment, so it is a release gate rather than a confirmed production regression.
- **Impact:** A route that can stall or take down the active server makes full launch validation impossible and risks masking real UI errors.
- **Repro:** Start `npm run dev`; sequentially render the discovered route inventory in Chromium at desktop and mobile sizes. After compilation pressure, request `/settings` and `/studio` with a 12-second timeout; the audit observed timeouts followed by server termination.
- **Suggested Fix:** Reproduce with server logs and memory/CPU profiling, isolate the route or dynamic import causing the stall, and add a bounded route-render smoke job. Do not close this gate until the complete route inventory can render twice without server failure.
- **Effort:** M

## P1 - Major UX/Functional Gaps (fix in next sprint)

### P1-001: Signup has a React hydration mismatch and mobile auth pages emit uncaught syntax errors
- **Page:** `/signup`, `/login`
- **Issue:** Desktop `/signup` logged React's hydration-mismatch warning for all three credential inputs: the server markup included `style={{caret-color:"transparent"}}` while the hydrated client markup did not. Mobile rendering of both `/signup` and `/login` emitted `PAGEERROR: Invalid or unexpected token`.
- **Impact:** Hydration defects can leave form state or event handlers inconsistent. Uncaught page errors on the entry path reduce signup trust and obscure later errors.
- **Repro:** Open `/signup` at 1440x900 and inspect the console. Then open `/login` and `/signup` at 390x844; inspect `pageerror`/DevTools console.
- **Suggested Fix:** Identify the server/client branch that adds the credential-input style and make the initial markup deterministic. Trace the syntax error to its generated or client script source, then add browser-console assertions for the auth route set.
- **Effort:** S
- **Evidence:** [`desktop-signup.png`](audit-screenshots/desktop-signup.png), [`mobile-login.png`](audit-screenshots/mobile-login.png), [`mobile-signup.png`](audit-screenshots/mobile-signup.png)

### P1-002: Core landing controls are unlabeled and below the required mobile touch size
- **Page:** `/`
- **Issue:** The primary source/edit composer renders three visible icon-only controls at 31x31px on desktop and mobile with no accessible name. The Send control is 87x35px and style controls such as Clone Editing Style and Improve are 28px tall. At 390px, the page says "Upload a source" but exposes only an unlabeled textarea plus these unlabeled controls in the browser control inventory; the actual video file-picker flow could not be verified.
- **Impact:** The first step of the core job is undiscoverable for screen-reader and keyboard users, difficult to tap on mobile, and cannot be confidently audited as a mobile video upload path.
- **Repro:** Open `/` at 390x844. Inspect button roles and bounding boxes: the hamburger is 44x44, but the three adjacent action buttons are 31x31 and have no text or `aria-label`.
- **Suggested Fix:** Give every composer action a clear accessible name and tooltip, make all touch controls at least 44x44px, and expose a labeled "Upload video" control that opens the file picker. Add an end-to-end mobile test selecting a real video fixture.
- **Effort:** S
- **Evidence:** [`mobile-home.png`](audit-screenshots/mobile-home.png), [`desktop-home-send-empty.png`](audit-screenshots/desktop-home-send-empty.png)

### P1-003: Requested mobile editor destinations are not routable as standalone pages
- **Page:** `/editor/music`, `/editor/chat`, `/editor/versions`, `/editor/status`, `/editor/timeline`, `/editor/analytics`
- **Issue:** Unauthenticated browser requests redirect to signup before route resolution. Separately, no matching `app/editor/<name>/page.tsx` implementation exists for Music, Chat, Versions, Status, Timeline, or Analytics; only `/editor/motion` and `/editor/workspace` exist. Authenticated behavior is therefore unverified, but the stated route contract cannot be fulfilled by the present route tree.
- **Impact:** Mobile navigation can lead to absent routes or lose the editor/project context rather than opening the intended tool. This directly affects music, timeline, versions, status, and analytics parity.
- **Repro:** Request each URL unauthenticated and observe the signup redirect. Inspect the route inventory under `app/editor/`; only `motion/page.tsx` and `workspace/page.tsx` are present besides `[id]/page.tsx`.
- **Suggested Fix:** Decide whether these tools are editor tabs or independent mobile routes. Implement the declared route contract with an explicit project identifier/context, or remove the destinations from navigation and document the intentional mobile limitation.
- **Effort:** M

## P2 - Polish & Enhancements (backlog)

### P2-001: Auth form password-visibility buttons do not meet mobile touch-target guidance
- **Page:** `/signup`
- **Issue:** Both Show password controls measure 28x28px at 390x844.
- **Impact:** They are difficult to use accurately on touch devices.
- **Repro:** Open `/signup` at 390x844 and inspect either Show password button.
- **Suggested Fix:** Make the icon button's interactive box at least 44x44px while keeping the visual icon compact.
- **Effort:** S

### P2-002: The landing style rail creates many off-screen duplicate interactive controls
- **Page:** `/`
- **Issue:** The rendered landing style rail contains repeated style buttons far beyond the viewport (for example, mobile elements with x positions above 3,000px and duplicate labels). The document itself did not horizontally overflow, but a long set of duplicated focusable controls increases keyboard and assistive-technology noise.
- **Impact:** Keyboard navigation and screen-reader traversal become harder to predict; it also increases render work on the first page.
- **Repro:** Open `/` at 390x844 and inspect the style-button list; repeated Iman, Reels Heat, Docs Story, Cinematic Noir, and other controls appear multiple times.
- **Suggested Fix:** Mark visual carousel clones inert/`aria-hidden`, or render a single semantic list and duplicate only a non-interactive visual layer.
- **Effort:** S

## P3 - Nice To Have (future)

### P3-001: Add a route-audit harness with persistent browser artifacts
- **Page:** All routes
- **Issue:** Route coverage currently depends on manual local rendering, and a partial server failure makes it difficult to distinguish a transient compile problem from a route failure.
- **Impact:** Regressions from iterative revamps will continue to escape until late in the release cycle.
- **Repro:** Run a manual route sweep; there is no single command that records viewport, final URL, console errors, overflow, and screenshots for every route.
- **Suggested Fix:** Commit a Playwright route-audit suite that consumes a maintained public/protected route manifest, uses approved seeded auth, fails on `pageerror`, captures screenshots on failure, and reports routes that redirect unexpectedly.
- **Effort:** M

---

## Mobile/Desktop Parity Matrix

| Feature | Desktop | Mobile | Gap? |
|---|---|---|---|
| Landing navigation | Rendered | Rendered; 44x44 hamburger present | No horizontal document overflow observed |
| Upload video | Visible entry copy, but picker not verified | Same; picker not verified | Yes - composer actions are unlabeled/31px |
| Create/open project | UNVERIFIED - requires auth | UNVERIFIED - requires auth | Cannot assess |
| Project thumbnails/cards | UNVERIFIED - requires auth | UNVERIFIED - requires auth | Cannot assess |
| Editor chat bubble/FAB | UNVERIFIED - requires auth | UNVERIFIED - requires auth | Cannot assess |
| Add music/audio | UNVERIFIED - requires auth | No standalone `/editor/music` page implementation | Yes / route contract gap |
| Timeline trim/split/reorder | UNVERIFIED - requires auth | No standalone `/editor/timeline` page implementation | Yes / route contract gap |
| Add text/subtitles | UNVERIFIED - requires auth | UNVERIFIED - requires auth | Cannot assess |
| Preview edit | UNVERIFIED - requires auth | UNVERIFIED - requires auth | Cannot assess |
| Export, progress, download | UNVERIFIED - requires auth | UNVERIFIED - requires auth | Cannot assess |
| Settings persistence/legal footer | UNVERIFIED - requires auth | UNVERIFIED - requires auth | Cannot assess |
| Billing/subscription data | UNVERIFIED - requires auth | UNVERIFIED - requires auth | Cannot assess |
| Login | Rendered; no page error in initial desktop capture | Rendered; `Invalid or unexpected token` page error | Yes |
| Signup | Rendered; hydration warning | Rendered; page error and 28px password toggles | Yes |
| Password reset and verification | Rendered | Rendered | No horizontal overflow observed |

---

## Navigation Audit

| Page | Has Back Button | Back Target | Mobile Nav | Notes |
|---|---|---|---|---|
| `/` | N/A | N/A | Yes | Rendered desktop/mobile; hamburger is 44x44 |
| `/login` | Yes | `/` (Home link) | No global nav | Rendered; mobile console page error |
| `/signup` | Yes | `/` (Home link) | No global nav | Rendered; hydration mismatch and mobile page error |
| `/forgot-password` | Yes | `/` (Home link) | No global nav | Rendered desktop/mobile |
| `/reset-password` | Yes | `/` (Home link) | No global nav | Rendered desktop/mobile |
| `/verify` | Yes | `/` (Home link) | No global nav | Rendered desktop/mobile; Back to sign in present |
| `/projects` | UNVERIFIED - requires auth | UNVERIFIED | UNVERIFIED | Redirected to `/signup?next=%2Fprojects` |
| `/projects/[id]` | UNVERIFIED - requires auth | UNVERIFIED | UNVERIFIED | Redirected in audit session |
| `/editor` | UNVERIFIED - requires auth | UNVERIFIED | UNVERIFIED | Redirected in audit session |
| `/editor/[id]` | UNVERIFIED - requires auth | UNVERIFIED | UNVERIFIED | Redirected in audit session |
| `/editor/music` | UNVERIFIED - requires auth | UNVERIFIED | UNVERIFIED | No matching route implementation found |
| `/editor/motion` | UNVERIFIED - requires auth | UNVERIFIED | UNVERIFIED | Route file exists; redirected in audit session |
| `/editor/chat` | UNVERIFIED - requires auth | UNVERIFIED | UNVERIFIED | No matching route implementation found |
| `/editor/versions` | UNVERIFIED - requires auth | UNVERIFIED | UNVERIFIED | No matching route implementation found |
| `/editor/status` | UNVERIFIED - requires auth | UNVERIFIED | UNVERIFIED | No matching route implementation found |
| `/editor/timeline` | UNVERIFIED - requires auth | UNVERIFIED | UNVERIFIED | No matching route implementation found |
| `/editor/analytics` | UNVERIFIED - requires auth | UNVERIFIED | UNVERIFIED | No matching route implementation found |
| `/editor/workspace` | UNVERIFIED - requires auth | UNVERIFIED | UNVERIFIED | Route file exists; redirected in audit session |
| `/settings` | UNVERIFIED - requires auth | UNVERIFIED | UNVERIFIED | Redirected; later request timed out under server instability |
| `/settings/profile` | UNVERIFIED - requires auth | UNVERIFIED | UNVERIFIED | Redirected in audit session |
| `/settings/profile/mfa` | UNVERIFIED - requires auth | UNVERIFIED | UNVERIFIED | Redirected in audit session |
| `/settings/social-accounts` | UNVERIFIED - requires auth | UNVERIFIED | UNVERIFIED | Redirected in audit session |
| `/settings/billing` | UNVERIFIED - requires auth | UNVERIFIED | UNVERIFIED | Redirected in audit session |
| `/settings/billing/success` | UNVERIFIED - requires auth | UNVERIFIED | UNVERIFIED | Redirected in audit session |
| `/billing` | UNVERIFIED - requires auth | UNVERIFIED | UNVERIFIED | Redirected in audit session |
| `/profile` | N/A | N/A | N/A | No direct route; profile settings are at `/settings/profile` |
| `/dashboard` | UNVERIFIED - requires auth | UNVERIFIED | UNVERIFIED | Redirected in audit session |
| `/assets` | UNVERIFIED - requires auth | UNVERIFIED | UNVERIFIED | Redirected in audit session |
| `/brand-kit` | UNVERIFIED - requires auth | UNVERIFIED | UNVERIFIED | Redirected in audit session |
| `/broll` | UNVERIFIED - requires auth | UNVERIFIED | UNVERIFIED | Redirected in audit session |
| `/captions` | UNVERIFIED - requires auth | UNVERIFIED | UNVERIFIED | Redirected in audit session |
| `/highlights` | UNVERIFIED - requires auth | UNVERIFIED | UNVERIFIED | Redirected in audit session |
| `/templates` | UNVERIFIED - requires auth | UNVERIFIED | UNVERIFIED | Redirected in audit session |
| `/team` | UNVERIFIED - requires auth | UNVERIFIED | UNVERIFIED | Redirected in audit session |
| `/analytics` | HTTP-rendered only | HTTP-rendered only | UNVERIFIED | No full UI assertion retained before server failure |
| `/mobile` | HTTP-rendered only | HTTP-rendered only | UNVERIFIED | No full UI assertion retained before server failure |
| `/pricing` | HTTP-rendered only | HTTP-rendered only | UNVERIFIED | No full UI assertion retained before server failure |
| `/studio` | Not rendered | Not rendered | UNVERIFIED | Timed out during the route sweep |
| `/contact` | Not rendered | Not rendered | UNVERIFIED | Server ended before render |
| `/privacy` | Not rendered | Not rendered | UNVERIFIED | Server ended before render |
| `/terms` | Not rendered | Not rendered | UNVERIFIED | Server ended before render |
| `/refund` | Not rendered | Not rendered | UNVERIFIED | Server ended before render |
| `/refund-policy` | N/A | N/A | N/A | No routable `page.tsx` implementation found |

---

## Console Evidence

```text
/signup, desktop:
A tree hydrated but some attributes of the server rendered HTML didn't match
the client properties ... input style={{caret-color:"transparent"}}

/login and /signup, mobile:
PAGEERROR: Invalid or unexpected token
```

