# Motion Timeline Direct Manipulation Design

## Goal

Make the Motion workspace timeline usable as an editor surface: each video, audio, caption, and text block can be selected, moved, trimmed, snapped, split, and inspected while the preview and playhead stay synchronized.

## Scope

This change applies only to `components/editor/motion-edit-workspace.tsx`, the timeline shown by the Motion tab in `app/editor/[id]/page.tsx`. The compact Editor timeline and its existing canvas timeline remain unchanged. Edits are session-local until a persistence contract exists; transcription data is not rewritten by timeline gestures.

## Architecture

Timeline item construction and time arithmetic live in a pure module at `lib/timeline/motion-timeline.ts`. The module owns item metadata, bounds, minimum duration, snapping candidates, move/trim operations, and split behavior so the interaction layer remains testable without a browser.

The Motion workspace owns the current item list and selected item. Its existing preview, seek, zoom, and timeline scroll state are extended in place. A single item identity is used by the timeline blocks and preview overlays, so selecting either representation updates the other.

## Interaction model

- Drag the center of a block to move it across its track while preserving duration.
- Drag the left or right edge handle to trim start or end. Bounds are clamped to the media duration and a 100 ms minimum duration is enforced.
- Move and trim operations snap to the playhead, the timeline boundary, and neighboring block boundaries using the existing snap-engine semantics.
- The timeline content uses a pixel scale derived from duration and the zoom slider, with both horizontal and vertical overflow enabled. The playhead uses the same pixel coordinate system and clicking the background seeks the preview.
- Selecting a block seeks to its start, highlights its timeline block, and opens a compact properties panel. Text blocks expose text, region, color, and animation controls; all blocks expose timing.
- The split action cuts the selected block at the current playhead when the playhead is inside the block, creating two independently selectable items with preserved metadata.
- Active text and caption overlays in the preview are selectable and select their corresponding timeline block.

## Accessibility and edge handling

Interactive blocks and handles are keyboard-focusable, have accessible labels, and do not allow child gestures to trigger timeline panning. Invalid trim positions are clamped rather than discarded. A selected item can be cleared when its source disappears.

## Verification

Pure move, trim, snap, split, and item-construction behavior is covered by Node tests. The Motion workspace is checked with the existing typecheck/build commands and a Playwright smoke flow that verifies the timeline renders, zoom changes its scrollable width, and an item can be selected.
