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
  assert.match(route, /type:\s*"status", message:\s*"Running editorial tools"/);
  assert.match(route, /type:\s*"tool",[\s\S]*label: completedToolCall\.label,[\s\S]*summary: completedToolCall\.summary/);

  // Live editor context + project (video) context are accepted and merged
  assert.match(route, /editorContext\?:\s*unknown/);
  assert.match(route, /frameThumbs\?:\s*unknown/);
  assert.match(route, /normalizeChatEditorContext\(body\?\.editorContext\)/);
  assert.match(route, /loadProjectChatContext\(projectId, \{playheadSec: editorContext\?\.playheadSec\}\)/);
  assert.match(route, /formatProjectContextForPrompt/);
  assert.match(route, /const activeVideo = projectContext\?\.video \?\? clientVideoContext\?\.video \?\? null/);
  assert.match(route, /clientVideoContext\?\.video\s*\? formatClientVideoContextForPrompt\(clientVideoContext\)/);
  assert.equal(route.includes("model configuration may need updating"), false);
  assert.match(
    route,
    /intent\.allowTools \|\| Boolean\(editorContext\) \|\| Boolean\(projectContext\?\.video\) \|\| Boolean\(clientVideoContext\?\.video\)/,
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
  assert.match(route, /use kind \\\"propose\\\" to present a clear execution plan/);
  assert.match(
    route,
    /Do not state an editor action occurred until it has been explicitly approved and confirmed/,
  );

  // Structured assistant payload is delivered as a metadata stream event
  assert.match(
    route,
    /type:\s*"metadata",[\s\S]*frames,[\s\S]*toolCalls,[\s\S]*actionDrafts,/,
  );
  assert.match(route, /send\(\{ type: "done", persisted \}\)/);

  const streamContract = read("lib/prometheus-assistant/chat-stream.ts");
  const chatHook = read("hooks/use-ai-chat.ts");
  const activity = read("components/editor/prometheus-chat-activity.tsx");
  assert.match(streamContract, /type: "tool"/);
  assert.match(streamContract, /isStreamToolCall/);
  assert.match(chatHook, /streamActivity/);
  assert.match(chatHook, /event\.type === "tool"/);
  assert.match(activity, /Live editorial process/);
  assert.match(activity, /entry\.detail/);
}

run();
