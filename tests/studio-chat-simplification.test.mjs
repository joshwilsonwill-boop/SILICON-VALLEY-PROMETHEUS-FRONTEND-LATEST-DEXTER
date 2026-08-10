import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../components/video-upload-interface.tsx", import.meta.url), "utf8");

assert.doesNotMatch(source, /const COMPOSER_MODES/);
assert.doesNotMatch(source, /setHoveredComposerMode|activeComposerMode|shouldShowComposerModes/);
assert.doesNotMatch(source, /\{ label: "Prompt", icon: ArrowUpIcon \}/);
assert.match(source, /\{ label: "Clip Dock", icon: Paperclip \}/);
assert.match(source, /\{ label: "Frames", icon: Film \}/);

console.log("studio-chat-simplification: all checks passed.");
