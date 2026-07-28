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
  const mobileInput = read("components/chat/mobile-chat-input.tsx");
  const hook = read("hooks/use-ai-chat.ts");

  assert.equal(existsSync(join(root, "components/editor/prometheus-chat-mobile.tsx")), true);
  assert.equal(existsSync(join(root, "components/editor/prometheus-chat-thinking-process.tsx")), true);
  assert.equal(existsSync(join(root, "components/editor/prometheus-chat-session-menu.tsx")), true);
  assert.equal(existsSync(join(root, "components/editor/ai-chat-overlay.tsx")), false);
  assert.equal(existsSync(join(root, "components/editor/ai-chat-trigger-desktop.tsx")), false);
  assert.equal(existsSync(join(root, "components/editor/ai-chat-new-session.tsx")), false);
  assert.equal(existsSync(join(root, "components/chat/chat-message-bubble.tsx")), true);
  assert.equal(existsSync(join(root, "components/chat/mobile-chat-input.tsx")), true);
  assert.equal(existsSync(join(root, "components/chat/streaming-controls.tsx")), true);
  assert.equal(existsSync(join(root, "hooks/use-copy-to-clipboard.ts")), true);
  assert.equal(existsSync(join(root, "hooks/use-voice-input.ts")), true);

  assert.match(chat, /useAIChat/);
  assert.match(chat, /AIChatStreamingText/);
  assert.match(chat, /getChatGreeting/);
  assert.doesNotMatch(chat, /AIChatOrb/);
  assert.doesNotMatch(chat, /PrometheusChatThinkingProcess/);
  assert.doesNotMatch(chat, /PrometheusChatSessionMenu/);
  assert.doesNotMatch(chat, /Mic/);
  assert.match(chat, /pinnedToBottomRef/);
  assert.match(chat, /var\(--font-elegist\)/);
  assert.doesNotMatch(chat, /New chat|Generate Code|Launch App|UI Components|Theme Ideas|Image Assets/);
  assert.doesNotMatch(shell, /AIChatOverlay/);
  assert.doesNotMatch(shell, /AIChatTriggerDesktop/);
  assert.doesNotMatch(hook, /ai-chat-new-session/);
  assert.match(mobileChat, /useAIChat/);
  assert.match(mobileChat, /onStreamingProgress/);
  assert.match(mobileChat, /getChatGreeting/);
  assert.match(mobileChat, /var\(--font-elegist\)/);
  assert.doesNotMatch(mobileChat, /PrometheusChatSessionMenu/);
  assert.doesNotMatch(mobileChat, /AIChatOrb/);
  assert.doesNotMatch(mobileChat, /PrometheusChatThinkingProcess/);
  assert.doesNotMatch(mobileInput, /Mic|Generate Code|Launch App|UI Components|Theme Ideas|Image Assets/);
  assert.match(mobileChat, /ChatMessageBubble/);
  assert.match(mobileChat, /MobileChatInput/);
  assert.match(mobileChat, /stopStreaming/);
  assert.doesNotMatch(mobileChat, /aria-label=\{`Delete \$\{item\.title\}`\}/);
  assert.match(mobileChat, /Close mobile chat backdrop/);
  assert.match(mobileChat, /handleDismissTouchEnd/);
  assert.match(mobileChat, /onTouchMove=\{\(event\) => event\.stopPropagation\(\)\}/);
  assert.match(shell, /if \(activeTool === "chat"\)/);
  assert.doesNotMatch(shell, /ChatPanel/);
}

run();
