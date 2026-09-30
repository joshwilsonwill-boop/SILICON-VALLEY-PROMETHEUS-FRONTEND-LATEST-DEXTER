# Gates: thumbnail generation response

OWNS: app/api/projects/[id]/thumbnails/nano-banana/route.ts, lib/thumbnails/**, tests/thumbnail-studio-design.test.mjs, GATES.md

Scope: Make the selected fast/pro quality match the requested render resolution and keep generated-image JSON responses below Vercel's response limit.

- [x] G1: Thumbnail response sizing and quality regression checks pass
  CHECK: node --test tests/thumbnail-studio-design.test.mjs tests/nano-banana-image.test.mjs
  EXPECT: ℹ pass 11
  EVIDENCE: automatic-evidence=v1; definition-sha256=61c2a0b73f8b44d92e667498453c9091781237b87f03aa35811b9d82b64ebc2a; exit=0; EXPECT=matched; output-sha256=fbb266ebbafe74e1630cb937e5870fefd5cc63756e7ba1efc13df6a737139f8f; output-bytes=2063; shell=C:\Windows\system32\cmd.exe; cwd=C:\Users\HomePC\Documents\THE FRONT END, PROMETHEUS; path=daf53fd1173d/38 entries

- [x] G2: Repository typecheck passes with the route changes
  CHECK: npm.cmd run typecheck
  EXPECT: typecheck passed
  EVIDENCE: automatic-evidence=v1; definition-sha256=56b8397f882f4f2eadc0c80ea6715604685447378d3170601b74e5c567ac8ef1; exit=0; EXPECT=matched; output-sha256=2c4af01fb1a5f9597841244575659986624ce8ada13bbc89dce9491fd48c4a46; output-bytes=93; shell=C:\Windows\system32\cmd.exe; cwd=C:\Users\HomePC\Documents\THE FRONT END, PROMETHEUS; path=daf53fd1173d/38 entries
