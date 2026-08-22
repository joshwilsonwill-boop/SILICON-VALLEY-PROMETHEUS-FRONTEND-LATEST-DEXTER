import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (relativePath) => readFileSync(join(root, relativePath), "utf8");

const desktop = read("components/editor/PrometheusChat.tsx");
const mobile = read("components/editor/prometheus-chat-mobile.tsx");

assert.doesNotMatch(desktop, /ActiveChatEngagement/);
assert.doesNotMatch(desktop, /active-chat-engagement/);
assert.doesNotMatch(mobile, /ActiveChatEngagement/);
assert.doesNotMatch(mobile, /active-chat-engagement/);

console.log("active-chat-engagement: pop-up removed from desktop and mobile chat");
