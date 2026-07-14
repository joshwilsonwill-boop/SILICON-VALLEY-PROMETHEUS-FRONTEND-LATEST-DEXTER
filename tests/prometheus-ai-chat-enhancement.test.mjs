import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();

function read(relativePath) {
  return readFileSync(join(root, relativePath), "utf8");
}

function run() {
  const requiredFiles = [
    "lib/user/display-name.ts",
    "lib/supabase/chat-sessions.ts",
    "lib/supabase/chat-messages.ts",
    "components/editor/ai-chat-streaming-text.tsx",
    "components/editor/ai-chat-history-button.tsx",
    "components/editor/ai-chat-history-panel.tsx",
    "components/editor/ai-chat-session-item.tsx",
    "components/editor/ai-chat-new-session.tsx",
    "supabase/migrations/202607141630_add_chat_history_profile_fields.sql",
  ];

  for (const file of requiredFiles) {
    assert.equal(existsSync(join(root, file)), true, `${file} must exist`);
  }

  const displayName = read("lib/user/display-name.ts");
  const sessions = read("lib/supabase/chat-sessions.ts");
  const messages = read("lib/supabase/chat-messages.ts");
  const streamingText = read("components/editor/ai-chat-streaming-text.tsx");
  const historyPanel = read("components/editor/ai-chat-history-panel.tsx");
  const overlay = read("components/editor/ai-chat-overlay.tsx");
  const hook = read("hooks/use-ai-chat.ts");
  const route = read("app/api/prometheus-chat/route.ts");
  const migration = read("supabase/migrations/202607141630_add_chat_history_profile_fields.sql");

  assert.match(displayName, /getUserDisplayName/);
  assert.match(displayName, /getChatGreeting/);
  assert.match(displayName, /return "Creator"/);
  assert.match(sessions, /chat_sessions/);
  assert.match(messages, /chat_messages/);
  assert.match(streamingText, /requestAnimationFrame/);
  assert.match(streamingText, /isComplete/);
  assert.match(historyPanel, /Chat History/);
  assert.match(overlay, /AIChatHistoryButton/);
  assert.match(overlay, /getChatGreeting/);
  assert.match(hook, /currentSessionId/);
  assert.match(hook, /insertChatMessage/);
  assert.match(route, /tool_use_failed/);
  assert.match(route, /couldn't search live data/i);
  assert.match(migration, /create table if not exists public\.chat_sessions/i);
  assert.match(migration, /create table if not exists public\.chat_messages/i);
}

run();
