import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (relativePath) => readFileSync(join(root, relativePath), "utf8");

const resolver = read("lib/prometheus-assistant/active-engagement.ts");
const component = read("components/editor/active-chat-engagement.tsx");
const desktop = read("components/editor/PrometheusChat.tsx");
const mobile = read("components/editor/prometheus-chat-mobile.tsx");

assert.match(resolver, /export function resolveActiveEngagement/);
assert.match(resolver, /cut|hook|sound|captions/);
assert.match(resolver, /workspaceTab/);
assert.match(resolver, /clean\(draft\)\.length < 3/);
assert.match(component, /Active engagement/);
assert.match(component, /\/library\/people\/dan-martell\.png/);
assert.match(component, /onSelect\(suggestion\.prompt\)/);
assert.match(component, /suggestion\.confidence/);
assert.match(desktop, /<ActiveChatEngagement[\s\S]*draft=\{composedDraft\}/);
assert.match(desktop, /inputRef\.current\?\.focus\(\)/);
assert.match(mobile, /<ActiveChatEngagement[\s\S]*draft=\{chat\.draft\}/);

console.log("active-chat-engagement: all assertions passed");
