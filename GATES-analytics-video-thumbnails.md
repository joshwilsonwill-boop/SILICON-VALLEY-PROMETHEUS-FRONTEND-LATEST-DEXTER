# Gates: Persist Video Frames in Analytics

OWNS: components/analytics/VideoPerformanceDashboard.tsx, lib/media/capture-first-video-frame.ts, GATES-analytics-video-thumbnails.md

Scope: Ensure Analytics captures a visible opening frame for tracked project videos and saves it as the project's reusable thumbnail.

- [x] G1: Missing video thumbnails are captured from a visible decoded frame and saved to the owning project so they remain available after Analytics reloads.
  EVIDENCE: Static review confirms Analytics PATCHes `thumbnailUrl` to the owning project route after capture; that route writes `projects.thumbnail_url`, and the Analytics feed reads that field on reload.

- [x] G2: Captured frames remain visible in the current Analytics session when persistence fails, and remote platform videos without a project id are not patched as projects.
  EVIDENCE: The frame enters local Analytics state before the best-effort PATCH; project PATCH is skipped when the video id contains the remote-video separator `:`.

- [x] G3: No temporary diagnostic instrumentation remains, and changes were reviewed against the project thumbnail persistence path.
  EVIDENCE: Reviewed the route, ProjectService update, Analytics API mapping, capture utility, and dashboard changes; no temporary logs or harnesses were added.
