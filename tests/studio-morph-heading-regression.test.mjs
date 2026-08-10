import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const source = readFileSync(
  join(process.cwd(), "components/video-upload-interface.tsx"),
  "utf8",
);

const match = source.match(/<GooeyText\s+texts=\{\[(.*?)\]\}/s);
assert.ok(match, "studio heading should render a GooeyText word set");

const words = [...match[1].matchAll(/["']([^"']+)["']/g)].map((entry) => entry[1]);
assert.ok(words.length > 1, "studio heading should provide multiple morph words");
assert.ok(
  words.every((word) => word.length === words[0].length),
  "all studio morph words should have the same character count",
);
assert.match(source, /className="h-\[0\.95em\] w-\[5\.5ch\] shrink-0"/);

console.log("studio-morph-heading-regression: all assertions passed");
