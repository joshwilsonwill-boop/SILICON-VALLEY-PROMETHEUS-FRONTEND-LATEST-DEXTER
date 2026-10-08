# Gates: Analytics Responsiveness and Video Detail

OWNS: components/analytics/VideoPerformanceDashboard.tsx, components/analytics/VideoPlatformGallery.tsx, components/ui/polaroid-line-carousel.tsx, lib/analytics/video-performance-dashboard.ts, components/projects/project-card.tsx, lib/projects/project-list.ts, lib/projects/types.ts, lib/media/capture-first-video-frame.ts

Scope: Improve analytics loading and interaction, show video-specific analytics in a modal, and use available video frames as thumbnails when a dedicated thumbnail is missing.

- [x] G1: Analytics archive carousel avoids expensive synchronous placeholder image generation during initial render.
  EVIDENCE: Reviewed carousel fallback generation; canvas output is now 480x300 and the full-frame pixel noise loop was removed.

- [x] G2: Selecting a video in analytics opens an accessible detail modal with that video's available performance statistics and thumbnail.
  EVIDENCE: Reviewed ranked-card buttons and keyboard-enabled carousel prints opening the shared Radix sheet with per-video metrics, image, and published link when available.

- [x] G3: Recent project and analytics cards use a real thumbnail when present and fall back to a captured first video frame when available.
  EVIDENCE: Reviewed both card paths; project cards lazily resolve the authorized source asset and analytics tries export previews before the authorized project source, captures a 640px JPEG first frame, and preserves existing thumbnails when valid.

- [x] G4: Implementation review confirms loading/error/empty states and keyboard dismissal remain usable.
  EVIDENCE: Reviewed analytics loading/error states, empty archive message, visible focus styling, keyboard activation, and Radix sheet dismissal controls.
