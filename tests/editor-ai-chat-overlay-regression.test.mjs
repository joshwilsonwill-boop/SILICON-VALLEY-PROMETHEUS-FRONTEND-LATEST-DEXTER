import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();

function read(relativePath) {
  return readFileSync(join(root, relativePath), "utf8");
}

function run() {
  const requiredFiles = [
    "components/editor/ai-chat-overlay.tsx",
    "components/editor/ai-chat-trigger-desktop.tsx",
    "components/editor/ai-chat-orb.tsx",
    "components/editor/ai-chat-message.tsx",
    "components/editor/ai-chat-input.tsx",
    "components/editor/ai-chat-suggestions.tsx",
    "components/editor/ai-chat-typing-indicator.tsx",
    "hooks/use-ai-chat.ts",
  ];

  for (const file of requiredFiles) {
    assert.equal(existsSync(join(root, file)), true, `${file} must exist`);
  }

  const shell = read("components/editor/EditorRouteShell.tsx");
  const sidebar = read("components/editor/EditorHamburgerSidebar.tsx");
  const overlay = read("components/editor/ai-chat-overlay.tsx");
  const hook = read("hooks/use-ai-chat.ts");

  assert.match(shell, /AIChatOverlay/);
  assert.match(shell, /AIChatTriggerDesktop/);
  assert.match(shell, /onOpenChatOverlay/);
  assert.match(sidebar, /onOpenChatOverlay\??:/);
  assert.match(sidebar, /item\.panel === "chat"/);
  assert.match(overlay, /fixed inset-0 z-\[60\]/);
  assert.match(overlay, /backdrop-blur-\[24px\]/);
  assert.match(overlay, /getChatGreeting/);
  assert.match(hook, /fetch\("\/api\/prometheus-chat"/);
  assert.match(hook, /projectId/);
  assert.match(hook, /social media content strategist/i);
  assert.match(hook, /originalPrompt/);
  assert.match(hook, /streamAssistantResponse/);
  assert.doesNotMatch(hook, /\/api\/editor-chat/);
}

run();
