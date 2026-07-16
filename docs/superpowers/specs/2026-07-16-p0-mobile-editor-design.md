# Prometheus Mobile Editor P0 Design

## Scope

Implement only the approved P0 items for the editor's mobile and desktop-parity surfaces. Do not add P1/P2 functionality such as captions, expanded player menus, portrait rotation, settings behavior, rich chat text, voice improvements, AI jobs, or draggable controls.

The editor uses the approved **layered app shell**. Persistent controls own independent fixed layers; transient sheets and drawers animate within separate layers and must never alter the command control's position.

## Component Ownership

| Concern | Owner |
| --- | --- |
| Mobile drawer header and navigation | `components/editor/EditorHamburgerSidebar.tsx` |
| Mobile sheet stacking and command clearance | `components/editor/EditorRouteShell.tsx` |
| Fixed command control | `components/editor/CommandZone.tsx` |
| Autoplay loop behavior | `app/editor/components/mobile-video-player.tsx` |
| Route-level media lifecycle | editor route page and shared audio store cleanup |
| Analytics empty state | `components/editor/panels/AnalyticsPanel.tsx` |
| Source metadata status view | `components/editor/panels/StatusPanel.tsx` plus editor metadata state |
| Music loading and failure UI | editor music panels and `useR2Music` consumer boundaries |
| Export layout and local download | `components/editor/panels/ExportPanel.tsx` and `components/editor/ExportDrawer.tsx` where used |
| Chat attachment validation and preview | active mobile/editor chat input components |

## Behavior

### Layered Shell

The drawer header shows a Prometheus mark on the panel background and exactly one close control. It does not render a wordmark behind a hamburger-derived close control.

`CommandZone` remains `fixed`, centered with `left: 50%` and `translateX(-50%)`. Mobile tool sheets reserve bottom clearance for the command control and open above it. Sheets never participate in the command control's layout flow.

### Player And Media Lifecycle

The autoplay control is an accessible, native-button-compatible switch with a gray off track and cyan/teal on track. Switching it on updates the underlying video loop behavior, so completion restarts playback. Switching it off leaves the video paused when it ends.

The editor route pauses its preview video and shared music audio when the route unmounts or the page is being unloaded. Sign-out also invokes the same cleanup path. It does not pause merely because the document becomes hidden while the editor remains mounted.

### Truthful Panels

Analytics renders only: "No analytics available yet. Post your video to see performance metrics." It provides an export CTA and contains no fabricated metric rows.

Status derives duration and dimensions from loaded video metadata and displays the source file's actual byte size when available. Missing values render as an em dash. It does not use hardcoded durations, adaptive-resolution labels, or estimated file sizes.

Music loading uses "Loading music library...". Failures use "Couldn't load music." and a Retry action that refetches. User-facing copy never exposes storage or infrastructure provider names.

### Export

Social destinations render in a responsive four-column tile grid on mobile with intrinsic text wrapping and fixed minimum tile sizing. The export surface does not manufacture an error state. Download creates an object URL from the available media response, clicks an `a[download]`, then revokes the URL. It reports a human-readable failure and retry only when the request truly fails.

### Chat Attachments

Before adding an attachment, chat checks image files against 20 MB and video files against 100 MB. Invalid selections show the specified human-facing validation errors and do not begin upload work. Valid selections create a local preview above the composer using an object URL, with the file size visible. Send payloads carry structured attachment data; they never synthesize a "Use this image reference: filename" message.

## Test-First Contracts

| Item | User action | Expected result |
| --- | --- | --- |
| Drawer header | Open mobile navigation | One close button and a Prometheus mark; no visible wordmark/text bleed. |
| Command anchor | Open each mobile tool surface | Command remains bottom-center; sheet content begins above its reserved clearance. |
| Autoplay | Enable loop and let video end | Player seeks/restarts; disabling loop leaves it ended and paused. |
| Media lifecycle | Navigate away, sign out, or unload | Preview and shared audio pause; mounted editor tab switching does not trigger cleanup. |
| Analytics | Open Analytics without posted metrics | Empty-state copy and export CTA appear, fabricated values do not. |
| Status | Load source metadata | Duration, dimensions, and file size match metadata; absent fields display em dash. |
| Music | Load or fail to load library | Product loading copy appears; failure offers Retry and no infrastructure names. |
| Export | Open destinations and choose download | Four-column non-overlapping tiles render; browser download path is called. |
| Chat upload | Select valid/oversized image or video | Valid file previews above composer; invalid file is rejected at 20 MB/100 MB before upload. |

## Error Handling

Every P0 async surface has a loading, success, and human-readable failure state. Infrastructure identifiers remain implementation details. No fabricated fallback metrics, fake render flashes, or raw fetch errors reach the user.

## Exclusions

This pass does not implement P1/P2/P3 work, including settings state logic, subtitle or more menus, fullscreen redesign, chat formatting or voice processing, music matching or track application, command AI operations, social publishing pipeline changes, analytics ingestion, or draggable floating controls.
