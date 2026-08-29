# Editorial Chamber Final Output Design

## Goal

When a project's AWS Lambda render completes, the Editorial Chamber must display the finished video as its primary preview. The user can switch between that final render and the project's original/reference source without leaving the chamber. The result must survive navigation and reloads rather than depending on in-memory browser state.

## Scope

This slice covers the desktop and mobile editor preview surfaces, the project-to-render association needed to recover a Lambda result, render-status reconciliation, the in-progress skeleton, the completion reveal, and the Original/Final selector.

It does not add render controls, a version browser, render comparison scrubbing, or support for choosing among multiple historical outputs. `Final` means the latest completed render associated with the project's current source. `Original` means the current project source/reference video.

## Current Gap

The render backend already completes a job with an `outputUrl`, and the frontend Mini-Run client can normalize that field. The project upload route can also receive a render dispatch response. However, the upload UI currently discards the returned job identifier. The editor therefore cannot recover the active or completed render after navigation, cannot promote the finished media into the preview, and has no durable basis for an Original/Final control.

## Architecture

### Project-scoped render receipt

Persist a small, project-scoped render receipt when a Lambda render is dispatched. It contains:

- project ID and source asset ID
- frontend-visible render job ID and upstream pipeline job ID when present
- lifecycle state: queued, processing, completed, or failed
- output URL or durable output locator when completed
- failure message when failed
- created and updated timestamps

The receipt must be owned by the authenticated project user. A result is eligible for display only when its source asset ID still matches the project's current source asset. Replacing the source invalidates an older final output for the primary preview.

The server owns upstream credentials and status normalization. The browser calls a project-scoped same-origin endpoint; it never calls Lambda or the render backend with service credentials directly.

### Status reconciliation

The upload commit path persists the dispatch receipt before returning. The project render endpoint exposes the latest eligible receipt and reconciles non-terminal receipts with the upstream status contract. A completed upstream payload must contain a usable video URL; `completed` without one is treated as a recoverable status error rather than a displayable final.

The editor polls only while the latest receipt is non-terminal. Polling stops on completion, failure, source replacement, or unmount. Reloading the editor loads the project receipt first and resumes reconciliation if necessary.

### Preview selection

The editor maintains two distinct media descriptors:

- `originalMedia`: the existing source-stage preview URL and media metadata
- `finalMedia`: the completed render URL and media metadata

The active view is `final` whenever an eligible completed result exists, including the first load after completion. Otherwise it is `original`. The user may explicitly switch between views after both are available. A new completed result promotes `final` once; it must not repeatedly override a user selection during unrelated rerenders.

Playback state is reset safely on a view change: pause the current media, switch the source, reset the playhead to zero, and wait for the new video's metadata before enabling playback. Timeline duration and seek behavior follow the active video. The original media record is never replaced or mutated by display selection.

## User Experience

### Rendering state

While a render receipt is queued or processing, the existing original video remains visible and usable. A compact skeletal treatment sits within the preview frame:

- a restrained animated edge trace around the media frame
- a small `Rendering final` status with the existing inline loading language
- subtle placeholder ticks for unavailable final metadata

The treatment must not cover the subject, resize the preview, block playback, or introduce a determinate progress bar when the backend does not provide trustworthy progress. Reduced-motion mode replaces moving traces with a static status treatment.

### Completion reveal

The reveal begins only after the final video element has loaded enough data to display a frame. This prevents an animation into a blank or broken surface.

The standard sequence is:

1. The active source pauses and the preview briefly dims.
2. A narrow highlight sweeps the preview boundary while the final frame resolves beneath it.
3. The final video sharpens and fades to full opacity.
4. A compact `Final ready` signal appears, then settles into the selector.

The sequence lasts about 900-1200 ms, does not change layout dimensions, and plays once per newly completed render ID. Reduced-motion mode crossfades in under 150 ms with no sweep, blur travel, or scale motion.

### Original/Final selector

Once a final exists, a two-option segmented control appears over the upper edge of the preview:

- `Original`
- `Final`

`Final` is selected by default and carries a restrained completion mark. The active indicator slides between options using the project's existing motion language. The control uses button semantics, exposes the selected state, has a visible keyboard focus treatment, and is reachable without hover. It remains compact on mobile and never overlaps transport controls or the chat composer.

Before a final exists, the selector is not shown; the rendering status is the only added control. A failed render leaves the original video active and replaces the working status with a dismissible, concise failure state. It must not imply that a final is available.

## Data and Error Rules

- Only the authenticated owner can read or reconcile a project's render receipt.
- A render for an outdated source asset cannot become the project's final preview.
- Missing or malformed output URLs are errors, not successful results.
- The final URL must be served through an existing trusted proxy or a signed/durable URL suitable for browser video playback. Expired signed URLs must be refreshable from a durable storage locator.
- A final-video load error falls back to Original, keeps the selector available for retry only when the URL can be refreshed, and shows a concise message.
- Network errors during reconciliation keep the last good preview visible and retry with bounded polling; they do not clear a previously completed final.
- The latest eligible completed render wins. Historical output browsing remains out of scope.

## Component Boundaries

### Render receipt service and routes

Own persistence, authorization, source matching, upstream status normalization, and output URL resolution. The editor consumes a stable project-level result shape and does not know backend credentials or raw Lambda response variants.

### Final output state hook

Own initial receipt loading, bounded polling, terminal lifecycle state, one-time completion detection, and cleanup. It exposes data rather than presentation details.

### Preview source selector

Purely resolves active media from original media, final media, and the user's current selection. Keeping this logic pure makes source replacement and stale-result behavior independently testable.

### Preview result controls

Own the skeletal overlay, completion reveal shell, and Original/Final segmented control. The existing `PreviewCanvas` retains video rendering and transport callbacks.

Mobile consumes the same result state and selector behavior rather than creating a second render lifecycle.

## Testing

### Unit and contract tests

- Persist a dispatch receipt returned by the upload commit path.
- Authorize project-scoped receipt reads and reject cross-project/source results.
- Normalize queued, processing, completed, failed, and completed-without-output responses.
- Resolve Original before completion and Final after a valid completion.
- Ignore stale completions from a replaced source.
- Preserve an explicit Original selection across ordinary rerenders.
- Promote each newly completed render to Final only once.

### Component tests

- Hide the selector before a final exists.
- Show the skeletal rendering treatment without covering or replacing Original.
- Default the selector to Final after completion.
- Switch video URL, duration source, and selected semantics in both directions.
- Fall back honestly on final load failure.
- Use the reduced-motion completion path when requested.

### Browser verification

Use the real editor route at desktop and mobile sizes with controlled project/render fixtures. Verify queued, completed, failed, reload-after-completion, source-replacement, and Original/Final keyboard interaction. Capture screenshots before and after completion and inspect that the preview, selector, timeline, header, and chat controls do not overlap.

## Success Criteria

- A valid Lambda completion automatically becomes the visible Editorial Chamber video after the final frame is playable.
- Reloading or revisiting the project still displays the latest eligible final output.
- The user can always return to the original/reference video and back to Final from the preview.
- Rendering, completion, failure, and reduced-motion states are visually coherent and accessible.
- Stale, missing, broken, or unauthorized results never replace the original preview.
- Existing source upload, playback, timeline, Music, Motion, chat, export, desktop, and mobile behavior remains functional.
