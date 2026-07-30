import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (relativePath) => readFileSync(join(root, relativePath), "utf8");

const source = read("components/ui/cinematic-text-reveal.tsx");

assert.match(source, /export function segmentGraphemes/);
assert.match(source, /Intl\.Segmenter/);
assert.match(source, /Array\.from/);
assert.match(source, /useReducedMotion/);
assert.match(source, /variant\??:\s*"measured"\s*\|\s*"hard-cut"/);
assert.match(source, /once\s*=\s*true/);
assert.match(source, /const MAX_STAGGER_MS = 360/);
assert.match(source, /className="sr-only"/);
assert.match(source, /aria-hidden="true"/);
assert.match(source, /role="text"/);
assert.match(source, /filter:\s*"blur\(5px\)"/);
assert.match(source, /clipPath/);
assert.match(source, /prefers-reduced-motion|reducedMotion/);

const desktop = read("components/editor/PrometheusChat.tsx");
const mobile = read("components/editor/prometheus-chat-mobile.tsx");

assert.match(desktop, /import \{ CinematicTextReveal \}/);
assert.match(desktop, /<CinematicTextReveal[^>]*variant="measured"/s);
assert.match(mobile, /import \{ CinematicTextReveal \}/);
assert.match(mobile, /<CinematicTextReveal[^>]*variant="measured"/s);

console.log("cinematic-text-reveal-regression: all assertions passed");
