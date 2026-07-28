import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();

function read(relativePath) {
  return readFileSync(join(root, relativePath), "utf8");
}

function run() {
  const requiredFiles = [
    "components/editor/PrometheusChat.tsx",
    "components/editor/ai-chat-orb.tsx",
    "components/editor/ai-chat-streaming-text.tsx",
    "hooks/use-ai-chat.ts",
  ];

  for (const file of requiredFiles) {
    assert.equal(existsSync(join(root, file)), true, `${file} must exist`);
  }

  const shell = read("components/editor/EditorRouteShell.tsx");
  const sidebar = read("components/editor/EditorHamburgerSidebar.tsx");
  const overlay = read("components/editor/PrometheusChat.tsx");
  const hook = read("hooks/use-ai-chat.ts");

  assert.doesNotMatch(shell, /AIChatOverlay/);
  assert.doesNotMatch(shell, /AIChatTriggerDesktop/);
  assert.doesNotMatch(shell, /onOpenChatOverlay/);
  assert.match(sidebar, /panel: "chat"/);
  assert.match(overlay, /getChatGreeting/);
  assert.match(overlay, /useAIChat/);
  assert.match(hook, /fetch\("\/api\/prometheus-chat\/stream"/);
  assert.match(hook, /projectId/);
  assert.match(hook, /social media content strategist/i);
  assert.match(hook, /originalPrompt/);
  assert.match(hook, /streamAssistantResponse/);
  assert.doesNotMatch(hook, /\/api\/editor-chat/);
}

run();
