import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();

function read(relativePath) {
  return readFileSync(join(root, relativePath), "utf8");
}

function run() {
  const chat = read("components/editor/PrometheusChat.tsx");
  const shell = read("components/editor/EditorRouteShell.tsx");
  const mobileChat = read("components/editor/prometheus-chat-mobile.tsx");
  const hook = read("hooks/use-ai-chat.ts");

  assert.equal(existsSync(join(root, "components/editor/prometheus-chat-mobile.tsx")), true);
  assert.equal(existsSync(join(root, "components/editor/prometheus-chat-thinking-process.tsx")), true);
  assert.equal(existsSync(join(root, "components/editor/prometheus-chat-session-menu.tsx")), true);
  assert.equal(existsSync(join(root, "components/editor/ai-chat-overlay.tsx")), false);
  assert.equal(existsSync(join(root, "components/editor/ai-chat-trigger-desktop.tsx")), false);
  assert.equal(existsSync(join(root, "components/editor/ai-chat-new-session.tsx")), false);

  assert.match(chat, /useAIChat/);
  assert.match(chat, /AIChatStreamingText/);
  assert.match(chat, /getChatGreeting/);
  assert.match(chat, /AIChatOrb/);
  assert.match(chat, /PrometheusChatThinkingProcess/);
  assert.match(chat, /PrometheusChatSessionMenu/);
  assert.match(chat, /Mic/);
  assert.match(chat, /pinnedToBottomRef/);
  assert.doesNotMatch(shell, /AIChatOverlay/);
  assert.doesNotMatch(shell, /AIChatTriggerDesktop/);
  assert.doesNotMatch(hook, /ai-chat-new-session/);
  assert.match(mobileChat, /useAIChat/);
  assert.match(mobileChat, /AIChatStreamingText/);
  assert.match(mobileChat, /getChatGreeting/);
  assert.match(mobileChat, /AIChatOrb/);
  assert.match(mobileChat, /PrometheusChatThinkingProcess/);
  assert.match(mobileChat, /Mic/);
  assert.match(shell, /if \(activeTool === "chat"\)/);
  assert.doesNotMatch(shell, /ChatPanel/);
}

run();
