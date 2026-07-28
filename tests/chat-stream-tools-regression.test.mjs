import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();

function read(relativePath) {
  return readFileSync(join(root, relativePath), "utf8");
}

function run() {
  const streamRoutePath = "app/api/prometheus-chat/stream/route.ts";
  assert.equal(existsSync(join(root, streamRoutePath)), true, streamRoutePath);
  const route = read(streamRoutePath);

  // Tool calling + planning pass
  assert.match(route, /PROMETHEUS_TOOLS/);
  assert.match(route, /tools:\s*\[\.\.\.PROMETHEUS_TOOLS\]/);
  assert.match(route, /tool_choice:\s*"auto"/);
  assert.match(route, /normalizeGroqToolCalls/);
  assert.match(route, /executePrometheusTool\(/);
  assert.match(route, /collectActionDrafts\(toolCalls\)/);
  assert.match(route, /isToolUseFailed\(error\)/);

  // Live editor context + project (video) context are accepted and merged
  assert.match(route, /editorContext\?:\s*unknown/);
  assert.match(route, /frameThumbs\?:\s*unknown/);
  assert.match(route, /normalizeChatEditorContext\(body\?\.editorContext\)/);
  assert.match(route, /loadProjectChatContext\(projectId\)/);
  assert.match(route, /formatProjectContextForPrompt/);
  assert.match(
    route,
    /intent\.allowTools \|\| Boolean\(editorContext\) \|\| Boolean\(projectContext\?\.video\)/,
  );

  // Client thumbnails become model-citable frame references
  assert.match(route, /function frameRefsFromThumbs\(/);
  assert.match(route, /normalizeChatFrameThumbs\(value\)/);
  assert.match(route, /Frame at the current playhead position\./);

  // System prompt carries live state + frame list + honest-action rules
  assert.match(route, /Live editor state:/);
  assert.match(route, /Available video frame thumbnails/);
  assert.match(route, /draft_editor_actions/);
  assert.match(route, /reference_video_frames/);
  assert.match(route, /never executed here/);
  assert.match(
    route,
    /Do not claim an editor action happened unless the user approved it/,
  );

  // Structured assistant payload is delivered as a metadata stream event
  assert.match(
    route,
    /type:\s*"metadata",[\s\S]*frames,[\s\S]*toolCalls,[\s\S]*actionDrafts,/,
  );
  assert.match(route, /send\(\{ type: "done", persisted \}\)/);
}

run();
