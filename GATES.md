# Gates: thumbnail generation response

OWNS: app/api/projects/[id]/thumbnails/nano-banana/route.ts, lib/thumbnails/**, tests/thumbnail-studio-design.test.mjs, GATES.md

Scope: Make the selected fast/pro quality match the requested render resolution and keep generated-image JSON responses below Vercel's response limit.

- [ ] G1: Thumbnail response sizing and quality regression checks pass
  CHECK: node --test tests/thumbnail-studio-design.test.mjs tests/nano-banana-image.test.mjs
  EXPECT: ℹ pass 11
  EVIDENCE: pending

- [ ] G2: Repository typecheck passes with the route changes
  CHECK: npm.cmd run typecheck
  EXPECT: typecheck passed
  EVIDENCE: pending
