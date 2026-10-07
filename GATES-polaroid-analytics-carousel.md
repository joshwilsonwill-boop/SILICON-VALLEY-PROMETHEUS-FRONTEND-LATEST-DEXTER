# Gates: Polaroid Line Carousel in Analytics Section

OWNS: components/ui/polaroid-line-carousel.tsx, components/analytics/VideoPerformanceDashboard.tsx, tests/polaroid-line-carousel.test.ts, GATES-polaroid-analytics-carousel.md

Scope: Replicate the full Polaroid Line Carousel component and integrate it into the Analytics section, reflecting the user's last 5-6 Prometheus-tracked videos with instant prints, sagging string physics, peg swings, and landscape painting fallbacks.

- [x] G1: PolaroidLineCarousel component implements physics simulation (springStep, swingStep, stringY, nearestAt, clamp, wrap), procedural landscape canvas painting (dawn, alpine, dusk, mist), and keyboard/drag interaction.
  CHECK: npx tsx tests/polaroid-line-carousel.test.ts
  EXPECT: polaroid line carousel verification passed
  EVIDENCE: PASS - exit=0; EXPECT=polaroid line carousel verification passed; all math and physics primitives, landscape procedural paint, drag/peg logic, and component exports validated.

- [x] G2: VideoPerformanceDashboard integrates PolaroidLineCarousel under the performance section, mapping the user's latest 5-6 Prometheus-tracked videos with titles, metrics, thumbnails, and fallback prints.
  CHECK: node tests/analytics-performance-dashboard-regression.test.mjs
  EXPECT: analytics performance dashboard regression checks passed
  EVIDENCE: PASS - exit=0; EXPECT=analytics performance dashboard regression checks passed; account filtering, video ranking, first frame extraction, and live prints carousel fully integrated.
