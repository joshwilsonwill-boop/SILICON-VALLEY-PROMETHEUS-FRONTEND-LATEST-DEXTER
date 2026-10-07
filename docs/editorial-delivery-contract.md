# Editor and Jarvis final render

The editor and Jarvis use `POST /api/projects/:projectId/exports`. The route authenticates the user, checks that the project and selected source belong to that user, verifies the requested saved timeline revision, creates a `project_exports` row, and submits its Mini-Run job id to VINCERE. A successful response means the backend accepted a tracked job; it does not mean rendering is complete.

The current Mini-Run contract renders a Maul portrait output from the project source. It creates its own backend edit plan. The editor's saved timeline is a separate format and is not passed into or applied by the worker yet; the UI reports this before the user starts a render. Do not describe these MP4s as renders of the editor's text, movement, soundtrack, or other saved layers.

The export history route polls active Mini-Run jobs and persists only backend-reported status and percentages. The gateway reads progress from the worker's `mini_run_jobs` row while Modal is active, and only reports completion after the Modal call returns its receipt. A completed receipt is delivered through the Mini-Run output endpoint, which resolves a fresh R2 download URL. Project export preview and download routes verify ownership before routing the browser to that authenticated delivery path.

The browser refreshes history every five seconds, resumes active jobs after reload, and shows the backend percentage when present. Without a percentage it shows an indeterminate hairline and does not invent a number. Completed output remains associated with the project, source asset, and Mini-Run job id. Source copies and development placeholders are never final renders.

Live render verification must follow the VINCERE Mini-Run audit and deployment receipt rules. Do not claim the worker is live or the MP4 is visually/audio verified based on code checks alone.
