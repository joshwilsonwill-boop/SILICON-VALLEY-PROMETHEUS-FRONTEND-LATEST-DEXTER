import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (relativePath) => readFileSync(join(root, relativePath), "utf8");

assert.equal(
  existsSync(join(root, "components/editor/chat-carousel.tsx")),
  true,
  "M2-2 requires an isolated ChatCarousel component",
);

const component = read("components/editor/chat-carousel.tsx");
const hook = read("hooks/use-ai-chat.ts");
const stream = read("lib/prometheus-assistant/chat-stream.ts");
const desktop = read("components/editor/PrometheusChat.tsx");
const mobile = read("components/editor/prometheus-chat-mobile.tsx");

assert.match(hook, /export type CarouselItemKind/);
assert.match(hook, /id: string;[\s\S]*kind: CarouselItemKind;[\s\S]*title: string;/);
assert.match(hook, /subtitle\?: string;[\s\S]*image\?: string;[\s\S]*badge\?: string;/);
assert.match(hook, /payload\?: \{[\s\S]*message\?: string;[\s\S]*tool\?: string;[\s\S]*args\?: Record<string, unknown>/);
assert.match(hook, /function normalizeCarouselItems\(input: unknown, max = 8\)/);
assert.match(hook, /items\.length < 3 \? \[\] : items/);
assert.match(hook, /metadata\.carousel/);

assert.match(stream, /carousel\?: unknown\[\]/);
assert.match(stream, /carousel: Array\.isArray\(value\.carousel\)/);
assert.match(hook, /streamCarousel = normalizeCarouselItems\(event\.carousel\)/);
assert.match(hook, /streamCarousel\.length \? \{ carousel: streamCarousel \}/);

assert.match(component, /export function ChatCarousel/);
assert.match(component, /items\.length < 3/);
assert.match(component, /\.slice\(0, 8\)/);
assert.match(component, /snap-x snap-mandatory/);
assert.match(component, /snap-start/);
assert.match(component, /ArrowLeft|"ArrowLeft"/);
assert.match(component, /ArrowRight|"ArrowRight"/);
assert.match(component, /\.focus\(\)/);
assert.match(component, /min-h-11/);
assert.match(component, /focus-visible:ring-2/);
assert.match(component, /loading="lazy"/);
assert.doesNotMatch(component, /fetch\(/);
assert.doesNotMatch(component, /#[0-9a-f]{3,8}\b/i);

for (const source of [desktop, mobile]) {
  assert.match(source, /<ChatCarousel/);
  assert.match(source, /message\.carousel/);
  assert.match(source, /item\.payload\?\.message/);
}

const desktopHandler = desktop.slice(
  desktop.indexOf("const handleCarouselSelect"),
  desktop.indexOf("const handleThreadScroll"),
);
const mobileHandler = mobile.slice(
  mobile.indexOf("const handleCarouselSelect"),
  mobile.indexOf("return ("),
);
assert.match(desktopHandler, /persistentChat\.sendMessage\(message\)/);
assert.match(mobileHandler, /chat\.sendMessage\(message\)/);
assert.doesNotMatch(desktopHandler, /fetch\(/);
assert.doesNotMatch(mobileHandler, /fetch\(/);

console.log("chat-carousel: all assertions passed");
