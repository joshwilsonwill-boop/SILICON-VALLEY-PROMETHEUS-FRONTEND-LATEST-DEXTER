import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { buildPrometheusChatMemory } from "../lib/prometheus-assistant/chat-memory";

const restoredSession = [
  {
    role: "user" as const,
    content: "Which part of the opening should we tighten?",
  },
  {
    role: "assistant" as const,
    content: "The last discussed point was the pause around 00:08.",
  },
];

assert.deepEqual(buildPrometheusChatMemory(restoredSession), [
  {
    role: "user",
    content: "Which part of the opening should we tighten?",
  },
  {
    role: "assistant",
    content: "The last discussed point was the pause around 00:08.",
  },
]);

assert.deepEqual(
  buildPrometheusChatMemory([
    { role: "user", content: "   " },
    { role: "assistant", content: "  Keep this point.  " },
  ]),
  [{ role: "assistant", content: "Keep this point." }],
  "restored memory should contain only meaningful, normalized dialogue",
);

const hook = readFileSync("hooks/use-ai-chat.ts", "utf8");
const loadStart = hook.indexOf("const loadSessionMessages");
const loadEnd = hook.indexOf("}, []);", loadStart);
const loadBody = hook.slice(loadStart, loadEnd);

assert.match(
  loadBody,
  /messagesRef\.current = restoredMessages[\s\S]*setMessages\(restoredMessages\)/,
  "refresh restoration must update the send-path memory before painting the thread",
);
assert.match(
  hook,
  /const history = buildPrometheusChatMemory\(options\?\.history \?\? messagesRef\.current\)/,
  "every new request must use the normalized persisted-memory format",
);
assert.match(
  hook,
  /const isSessionMemoryReady = !activeSessionId \|\| memorySessionIdRef\.current === activeSessionId/,
  "model memory must belong to the active session",
);
assert.match(
  hook,
  /if \(!text \|\| isSending \|\| isHistoryLoading \|\| !isSessionMemoryReady\) return/,
  "a send must wait until refresh/session history restoration has completed",
);
assert.match(
  hook,
  /\[draft, ensureSession, isHistoryLoading, isSending, projectId, refreshSessions\]/,
  "the send callback must react to the history-loading gate",
);
assert.match(
  loadBody,
  /memorySessionIdRef\.current = sessionId/,
  "successful restoration must identify the session that owns model memory",
);
assert.match(
  hook,
  /memorySessionIdRef\.current = null;[\s\S]*setHistoryLoadError\(null\)/,
  "switching sessions must invalidate prior-session memory before loading",
);
assert.match(
  hook,
  /messagesRef\.current = \[\];[\s\S]*memorySessionIdRef\.current = session\.id;[\s\S]*setMessages\(\[\]\)/,
  "a new session must synchronously start with empty model memory",
);

console.log("chat-memory-resume: all assertions passed");
