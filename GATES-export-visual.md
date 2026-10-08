# Gates: Export dialog visual restoration

OWNS: components/editor/ExportDrawer.tsx, tests/export-and-motion-parity.test.mjs

Scope: Restore the compact dark export dialog shown in the user's screenshot while keeping account links, export readiness, and source-render limitations truthful.

- [x] G1: The modal follows the reference hierarchy: Export Video header, three-column social destinations, two storage destinations, compact four-field settings row, and concise footer actions.
  EVIDENCE: Manually reviewed ExportDrawer JSX against the supplied screenshot. It now has the compact title, three-column social cards, two storage cards, one row of four output settings, and a short footer with Cancel and Export now.

- [x] G2: The primary action still submits only the supported source-based Mini-Run, while unsupported direct publishing and output options are clearly identified.
  EVIDENCE: Manually traced the Export now button to startRender and the supplied onStartRender callback. Copy states that direct publishing is unavailable, the render remains 1080p portrait MP4, and timeline edits, editor captions, and selected music are not applied. Settings display aria-disabled fixed values.

- [x] G3: Readiness, timeline sync, account errors, loading, and completed-download states remain visible and usable without returning to the oversized preflight layout.
  EVIDENCE: Manually reviewed the conditional readiness/retry notices, timeline sync status and retry, account retry, submitting status, and finished MP4 download action in ExportDrawer.
