# Editorial MP4 delivery contract

The frontend project editor submits `POST /api/projects/:projectId/exports` with `{ preset: "default", sourceAssetId, editorialRevision }`. The server must authenticate the user, verify that the project and its current source asset belong to that user, and read the saved editorial timeline at that revision. A successful response includes `{ export: ProjectExport }` for a new `project_exports` row in `pending` or `processing` state.

The render worker should receive the saved timeline, including each text cue's `context.textStyle` object. That object contains `fontFamily`, `fontSizePx`, `maxWidthPct`, `xPct`, `yPct`, and `animation`. The frontend stores text content in `cue.text`, timing in `cue.start` and `cue.end`, and user edits set `cue.origin` to `editor`. Values are percentages of the output frame for width and placement. If the worker cannot apply one of these values, the route should report that limitation instead of claiming the edit was rendered.

Every export row must keep `metadata.sourceAssetId` and should set `metadata.outputKind` to `rendered`. On completion, the worker must place the actual MP4 in the exports R2 bucket, set `storage_bucket`, `storage_path`, `mime_type: video/mp4`, and mark the row `completed`. Failure must set `failed` with `error_message`. Keep the source asset's original object separate. The source-copy placeholder (`outputKind: source-copy-placeholder` or `devProof: true`) is never a final render.

The editor reads `GET /api/projects/:projectId/exports/history`, filters records to the current source, and polls while processing. It plays completed MP4s through the authenticated range-capable `GET /api/exports/:exportId/preview` route and requests downloads through `GET /api/exports/:exportId/download-url`. This keeps R2 keys out of browser video URLs and allows many versions per project.

The current project export POST route returns `RENDER_UNAVAILABLE` (503). The loop is complete only after that route creates a tracked job, the Modal worker finishes it, the MP4 is stored in R2, and the preview route can stream the file for the same authenticated project.
