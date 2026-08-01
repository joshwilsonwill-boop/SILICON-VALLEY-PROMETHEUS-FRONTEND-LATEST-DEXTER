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
assert.match(source, /renderGrapheme\??:/);
assert.match(source, /once\s*=\s*true/);
assert.match(source, /const MAX_STAGGER_MS = 360/);
assert.match(source, /className="sr-only"/);
assert.match(source, /aria-hidden="true"/);
assert.match(source, /role="text"/);
assert.match(source, /filter:\s*"blur\(5px\)"/);
assert.match(source, /clipPath/);
assert.match(source, /prefers-reduced-motion|reducedMotion/);
assert.match(source, /renderGrapheme\?\.\(grapheme\)\s*\?\?\s*grapheme/);
assert.doesNotMatch(source, /let glyphIndex/);

const desktop = read("components/editor/PrometheusChat.tsx");
const mobile = read("components/editor/prometheus-chat-mobile.tsx");
const greeting = read("components/editor/elegist-chat-greeting.tsx");

assert.match(greeting, /import \{ CinematicTextReveal \}/);
assert.match(greeting, /<CinematicTextReveal[^>]*variant="measured"/s);
assert.match(desktop, /import \{ ElegistChatGreeting \}/);
assert.match(desktop, /<ElegistChatGreeting/);
assert.match(mobile, /import \{ ElegistChatGreeting \}/);
assert.match(mobile, /<ElegistChatGreeting/);

console.log("cinematic-text-reveal-regression: all assertions passed");
