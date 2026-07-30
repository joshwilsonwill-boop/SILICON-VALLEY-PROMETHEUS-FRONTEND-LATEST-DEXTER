import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();

function read(relativePath) {
  return readFileSync(join(root, relativePath), "utf8");
}

function run() {
  const rail = read("components/sidebar/AwwwardsSidebar.tsx");
  const shell = read("components/editor/EditorRouteShell.tsx");

  // Collapsed icon rail that expands on hover/focus, never shifting layout
  assert.match(rail, /RAIL_COLLAPSED_WIDTH = 72/);
  assert.match(rail, /RAIL_EXPANDED_WIDTH = 216/);
  assert.match(rail, /onExpandedChange\?: \(expanded: boolean\) => void/);
  assert.match(rail, /onExpandedChange\?\.\(next\)/);
  assert.match(rail, /data-expanded=\{expanded \? "true" : "false"\}/);
  assert.match(rail, /onMouseEnter=\{\(\) => updateExpanded\(true\)\}/);
  assert.match(rail, /onMouseLeave=\{\(\) => updateExpanded\(false\)\}/);
  assert.match(rail, /onFocusCapture=\{\(\) => updateExpanded\(true\)\}/);
  assert.match(rail, /onBlurCapture=\{collapseIfFocusLeft\}/);
  assert.match(rail, /w-\[72px\]/);
  assert.match(rail, /absolute inset-y-0 left-0 z-30/);
  assert.match(rail, /overflow-hidden border-r border-border-subtle/);

  // Distinctive icon set for the chamber tools
  assert.match(rail, /Clapperboard/);
  assert.match(rail, /History/);
  assert.match(rail, /Brain/);
  assert.match(rail, /LineChart/);

  // Micro-interactions: sliding active marker, staggered labels, hover lift
  assert.match(rail, /layoutId="editor-rail-active"/);
  assert.match(rail, /delay=\{0\.06 \+ index \* 0\.03\}/);
  assert.match(rail, /delay: expanded \? delay : 0/);
  assert.match(rail, /group-hover:scale-105/);
  assert.match(rail, /motion-reduce:transform-none/);
  assert.match(rail, /group-hover:rotate-45/);

  // Decluttered: no count badges remain
  assert.equal(rail.includes("count:"), false);
  assert.equal(rail.includes("ml-auto rounded-full"), false);

  // Pre-existing contract preserved (see editor-polish-regression.test.mjs)
  assert.match(rail, /href: "\/editor\/motion"/);
  assert.match(rail, /href: "\/projects"/);
  assert.match(rail, /router\.back\(\)/);
  assert.match(rail, /New project/);
  assert.equal(rail.includes("WORKSPACE"), false);
  assert.equal(rail.includes("Create workspace item"), false);
  assert.equal(rail.includes("setActive"), false);

  // Settings is wired to the shell settings panel instead of being dead
  assert.match(rail, /onOpenSettings\?: \(\) => void/);
  assert.match(rail, /onClick=\{onOpenSettings\}/);
  assert.match(shell, /onOpenSettings=\{\(\) => openSettingsPanel\("appearance"\)\}/);
  assert.match(shell, /onExpandedChange=\{setRailExpanded\}/);

  // Expanded rail covers the z-header command island while collapsed rail remains below it.
  assert.match(shell, /const \[railExpanded, setRailExpanded\] = useState\(false\)/);
  assert.match(shell, /z-\[var\(--z-rail-expanded\)\]/);
  assert.match(shell, /z-\[var\(--z-rail-collapsed\)\]/);
  assert.equal(shell.includes("window.innerWidth"), false);
}

run();
