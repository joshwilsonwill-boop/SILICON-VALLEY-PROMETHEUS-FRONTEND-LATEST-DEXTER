# FE-UI-001 Completion Record

Status: Completed on 2026-07-08
Parent tracker: `docs/issues/frontend-visual-issue-tracker-2026-07-08.md`
Primary route: `/projects`

## Scope

Rebuilt the project card surface to remove the sub-premium radial/rotating hover treatment and make project actions discoverable without relying on hover.

## Implementation Notes

- Rebuilt `components/projects/project-card.tsx` as a dedicated project-card surface instead of using the shared rotating `GlassCard`.
- Removed the radial placeholder treatment and thumbnail scale hover.
- Added clear `Open` affordances and a persistent `MoreHorizontal` action menu for touch and desktop users.
- Added `tests/project-card-visual-regression.test.mjs`.

## Verification

- `node tests/project-card-visual-regression.test.mjs`
- `node --import tsx tests/project-list.test.ts`
- `npm.cmd run typecheck`
- `git diff --check`

## Visual Evidence

- `audit-artifacts/projects-card-rebuild/projects-desktop-viewport.png`
- `audit-artifacts/projects-card-rebuild/projects-mobile-viewport.png`
- `audit-artifacts/projects-card-rebuild/results.json`

## Notes

The main tracker file could be read but not updated in this session because the Windows sandbox repeatedly returned ACL helper failures or timed out during guarded writes. This companion record preserves the issue state without risking tracker corruption.
