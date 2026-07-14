# Frontend Audit - Issue Tracker

**Date:** 2026-07-14
**Auditor:** Codex Agent
**Commit:** `3e1373b9d4ce447e55296709c636c2b2fd0a41a3`

---

## Audit Evidence And Scope

The data-backed checks below used an authenticated, user-supplied account in a clean Chromium browser profile. Credentials and record names are intentionally omitted. The account's authenticated API returned **two persisted projects** from `GET /api/projects`, a source asset plus signed source URL for each from `GET /api/projects/[id]/assets`, and **50 music tracks** from `GET /api/music/catalog`.

This distinguishes a real persisted-data defect from the prior synthetic-account audit: the browser has a valid Supabase session and the backend has data, but the rendered project/dashboard/editor surfaces do not hydrate it. The account's existing local browser state may mask this failure in a returning browser profile.

Real upload mutation, export creation/download, payment mutation, and social publishing were not performed. Motion's mobile desktop-only message and direct social posting are documented intentional limitations, not issues.

Evidence: [`real-account projects`](audit-screenshots/real-account-projects-desktop.png), [`real-account editor desktop`](audit-screenshots/real-account-editor-desktop.png), [`real-account editor mobile`](audit-screenshots/real-account-editor-mobile.png), [`music-tab attempt`](audit-screenshots/real-account-editor-music-desktop.png), and [`settings mobile`](audit-screenshots/audit-settings-mobile.png).

---

## P0 - Ship Blockers (fix before launch)

### P0-001: Persisted projects do not appear in the Projects workspace
- **Page:** `/projects`
- **Issue:** In the authenticated account, `GET /api/projects` returns two persisted project records. At the same time, the rendered `/projects` page contains no project cards, thumbnails, titles, or empty-state explanation. It shows only the shell, `New Project`, and filters.
- **Impact:** A user moving to a new browser/device, clearing local storage, or returning without a warm local cache cannot discover or open their persisted work. This blocks the core open -> edit -> export workflow despite the records existing in Supabase.
- **Repro:** Sign in with an account that has at least one project; confirm the API's non-zero project count; navigate to `/projects` in a clean browser profile. Observe no cards after the page settles.
- **Suggested Fix:** Make the projects page query `/api/projects` (or the existing server-side project service) as its source of truth, then reconcile it with local drafts/cache. Show a loading state, a real empty state only for zero records, and an error/retry state when the request fails.
- **Effort:** M
- **Evidence:** [`real-account projects`](audit-screenshots/real-account-projects-desktop.png)

### P0-002: Opening a persisted project ID does not hydrate the editor with its saved data
- **Page:** `/editor/[id]`
- **Issue:** The first persisted project ID returned by the authenticated API was opened directly. Its `/api/projects/[id]/assets` endpoint returned a source asset and signed source URL, but both desktop and mobile rendered the fallback `Untitled Project` and an upload prompt (`Drop or choose source` / `Waiting for video`) rather than the saved media. The route project ID is therefore not being loaded into the editor's rendered state.
- **Impact:** Direct links, bookmarks, cross-device access, and project-list navigation cannot reliably resume an existing edit. The user is pushed into a new/empty editor instead of their saved work.
- **Repro:** Fetch an existing ID from `GET /api/projects`; navigate to `/editor/<that-id>` in a clean authenticated browser profile; compare the rendered fallback state with the API record.
- **Suggested Fix:** Fetch and validate the route project ID before initializing editor state. Hydrate source media, title, timeline, and saved settings from the persisted record; retain local storage only as an explicit offline/draft cache with deterministic reconciliation.
- **Effort:** L
- **Evidence:** [`editor desktop`](audit-screenshots/real-account-editor-desktop.png), [`editor mobile`](audit-screenshots/real-account-editor-mobile.png)

---

## P1 - Major UX/Functional Gaps (fix in next sprint)

### P1-001: Settings exposes explicitly unfinished preference and integration controls
- **Page:** `/settings`
- **Issue:** The rendered settings UI labels several controls as `Mock`, `UI scaffolding`, `UI only`, and `Mock connect states`. This includes notification preferences, reduced-motion override, safe mode, Google Drive, and Dropbox. The three switches render as 36x20px controls, below the 44px mobile touch-target requirement.
- **Impact:** Users can reasonably expect these settings to affect their workspace, but the UI itself states that they are placeholders. Small switch controls are also harder to use on touch devices.
- **Repro:** Open `/settings` at desktop or 390x844 mobile. Inspect the Notifications, Integrations, and Safety sections and switch boxes.
- **Suggested Fix:** Connect each shipping control to persisted preferences with loading/success/error states, or remove it from the production settings surface until it is functional. Expand switch hit areas to at least 44x44px.
- **Effort:** M
- **Evidence:** [`settings mobile`](audit-screenshots/audit-settings-mobile.png)

---

## P2 - Polish & Enhancements (backlog)

### P2-001: Desktop sidebar collapse control is below touch-target guidance
- **Page:** `/projects`, `/settings`
- **Issue:** The visible desktop `Collapse sidebar` button measures 36x36px.
- **Impact:** Minor usability friction on touch-capable laptops and tablets.
- **Repro:** Render either page at 1440x900 and inspect the control's bounding box.
- **Suggested Fix:** Keep the icon size but give the button a 44x44px hit area.
- **Effort:** S

---

## P3 - Nice To Have (future)

### P3-001: Add cross-browser persisted-project browser tests
- **Page:** `/projects`, `/editor/[id]`, `/editor/[id]` Music
- **Issue:** The existing application state can appear complete in a browser that holds local project state, while a clean authenticated profile exposes the missing server hydration path.
- **Impact:** Cross-device and cold-start regressions evade manual testing.
- **Repro:** Compare a warm existing browser profile with a clean profile signed into the same account.
- **Suggested Fix:** Add Playwright coverage that signs into a seeded account in a new browser context, asserts persisted cards on `/projects`, opens one by ID, checks its source/timeline/title, opens Music, and verifies a selected track survives reload.
- **Effort:** M

### P3-002: Make the local visual-audit server lifecycle resilient
- **Page:** All routes
- **Issue:** A large sequential local route sweep produced connection resets/refusals after substantial compilation. This is an audit-environment observation, not a verified deployed-product defect.
- **Impact:** It interrupts broad responsive inspection and makes failures harder to reproduce.
- **Repro:** Sequentially render the full route inventory with local `next dev --webpack` and browser automation.
- **Suggested Fix:** Use an isolated Playwright web-server lifecycle, route batches, and failure screenshots/logs; treat development-server stability separately from production behavior.
- **Effort:** M

---

## Mobile/Desktop Parity Matrix

| Feature | Desktop | Mobile | Gap? |
|---|---|---|---|
| Authenticated project records | API returns 2; cards do not render | Requires final populated-project rerun after P0 fix | Yes, P0-001 |
| Open existing project | Renders fallback empty editor for persisted ID | Renders fallback mobile empty editor for persisted ID | Yes, P0-002 |
| Upload source | Fallback source chooser renders | Fallback source chooser renders | Real upload mutation not performed |
| Music catalog | API returns 50 tracks; UI flow UNVERIFIED because the editor is in fallback state | UNVERIFIED | Blocked by P0-002 |
| Timeline, subtitles, preview | UNVERIFIED - editor did not hydrate persisted media | UNVERIFIED | Blocked by P0-002 |
| Export, progress, download | UNVERIFIED - no mutation performed | UNVERIFIED | Blocked by P0-002 |
| Editor chat/navigation | Visible Chat action and drawer render | Drawer renders; no canvas chat FAB observed | Mobile behavior appears intentional |
| Motion | Renders | Deliberately desktop-only message | Intentional limitation |
| Settings | Placeholders visible | Placeholders and 36x20 switches visible | Yes, P1-001 |
| Billing/subscription | API response is account-dependent; mutation not performed | Same | UNVERIFIED |

---

## Navigation Audit

| Page | Has Back Button | Back Target | Mobile Nav | Notes |
|---|---|---|---|---|
| `/` | N/A | N/A | Hamburger visible | Rendered both sizes; no document overflow observed |
| `/login`, `/signup`, `/forgot-password`, `/reset-password`, `/verify` | Yes | `/` Home link | Auth-page Home link | Rendered both sizes |
| `/projects` | No | N/A | Shell rendered | Persisted records absent from the visual workspace, P0-001 |
| `/editor/[id]` | Yes | Editor Back action | Editor drawer | Existing project ID falls back to empty state, P0-002 |
| `/editor/motion` | Motion UI renders | Desktop-only message | Editor drawer | Deliberate limitation confirmed |
| `/settings` | Yes | `/studio` | Shell rendered | Legal footer present; P1-001 verified |
| `/settings/profile`, `/settings/profile/mfa`, `/settings/social-accounts` | Rendered | Rendered | UNVERIFIED in populated context | Direct social publishing intentionally not configured |
| `/settings/billing`, `/billing`, `/settings/billing/success` | Shell/redirect rendered | Shell/redirect rendered | Account-dependent content not mutated | Subscription workflow UNVERIFIED |
| Other routes in `app/` | PARTIALLY UNVERIFIED | PARTIALLY UNVERIFIED | PARTIALLY UNVERIFIED | Full sweep interrupted by local development-server instability |
| `/profile` | N/A | N/A | N/A | No direct route implementation; profile is at `/settings/profile` |

---

## Console / Runtime Evidence

```text
Authenticated API checks:
GET /api/auth/me          -> 200
GET /api/projects         -> 200, 2 project records
GET /api/projects/[id]/assets -> 200, source asset and signed source URL for both projects
GET /api/music/catalog        -> 200, 50 tracks

Rendered persisted-project route:
/editor/<persisted-id> -> fallback "Untitled Project" / source-upload state

Additional observed request error:
GET /rest/v1/profiles -> 400 while rendering the desktop editor.
```
