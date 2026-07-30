import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import chatMessagesModule from "../lib/supabase/chat-messages";

const { fetchChatMessageRows, isMissingClientMessageIdError, mapChatMessageRecord } =
  chatMessagesModule;

const root = process.cwd();

function read(relativePath) {
  return readFileSync(join(root, relativePath), "utf8");
}

const FIXTURE_ROWS = [
  {
    id: "m-1",
    session_id: "session-1",
    role: "user",
    content: "Tighten the opening cut.",
    platform: null,
    post_type: null,
    metadata: {},
    created_at: "2026-07-28T10:00:00.000Z",
  },
  {
    id: "m-2",
    session_id: "session-1",
    role: "assistant",
    content: "Hold on the strongest visual beat first.",
    platform: null,
    post_type: null,
    metadata: {},
    created_at: "2026-07-28T10:00:42.000Z",
  },
];

// --- Behavioral: fallback and mapping (pure-function level) -----------------

// (a) Missing-column error -> single retry WITHOUT client_message_id, rows populate.
{
  const columnsSeen = [];
  const missingColumnError = {
    code: "42703",
    message: "column chat_messages.client_message_id does not exist",
  };
  const records = await fetchChatMessageRows(async (columns) => {
    columnsSeen.push(columns);
    if (columns.includes("client_message_id")) {
      return { data: null, error: missingColumnError };
    }
    // The legacy schema has no client_message_id column, so rows omit it.
    return { data: FIXTURE_ROWS, error: null };
  });

  assert.equal(columnsSeen.length, 2, "expected exactly one retry after the missing-column error");
  assert.ok(columnsSeen[0].includes("client_message_id"), "first attempt selects client_message_id");
  assert.equal(
    columnsSeen[1].includes("client_message_id"),
    false,
    "fallback SELECT must drop client_message_id",
  );
  assert.equal(records.length, 2, "fallback rows populate the thread");
  assert.equal(records[0].content, "Tighten the opening cut.");
  assert.equal(records[1].role, "assistant");
  assert.equal(
    records[0].client_message_id,
    null,
    "rows from the legacy schema map client_message_id to null",
  );
}

// (a2) PGRST204 schema-cache variant also triggers the fallback.
{
  assert.ok(
    isMissingClientMessageIdError({
      code: "PGRST204",
      message:
        "Could not find the 'client_message_id' column of 'chat_messages' in the schema cache",
    }),
  );
  assert.ok(isMissingClientMessageIdError({ code: "42703" }));
  assert.ok(
    isMissingClientMessageIdError({
      message: "column chat_messages.client_message_id does not exist",
    }),
  );
}

// (b) Generic errors are NOT swallowed and do NOT trigger the fallback retry.
{
  for (const benignError of [
    { code: "42501", message: "permission denied for table chat_messages" },
    { code: "PGRST301", message: "JWT expired" },
    new Error("fetch failed"),
    null,
  ]) {
    assert.equal(isMissingClientMessageIdError(benignError), false);
  }

  const genericError = { code: "42501", message: "permission denied for table chat_messages" };
  let attempts = 0;
  let thrown = null;
  try {
    await fetchChatMessageRows(async () => {
      attempts += 1;
      return { data: null, error: genericError };
    });
  } catch (err) {
    thrown = err;
  }
  assert.equal(thrown, genericError, "the original error must propagate unchanged");
  assert.equal(attempts, 1, "generic errors must not fall through to the missing-column retry");
}

// (b2) Happy path issues exactly one query.
{
  let attempts = 0;
  const records = await fetchChatMessageRows(async (columns) => {
    attempts += 1;
    assert.ok(columns.includes("client_message_id"));
    return { data: FIXTURE_ROWS.map((row) => ({ ...row, client_message_id: `client-${row.id}` })), error: null };
  });
  assert.equal(attempts, 1);
  assert.equal(records[0].client_message_id, "client-m-1");
}

// (b3) Defensive row mapping.
{
  const mapped = mapChatMessageRecord({
    id: "m-9",
    session_id: "session-1",
    role: "assistant",
    content: "ok",
    created_at: "2026-07-28T11:00:00.000Z",
  });
  assert.equal(mapped.client_message_id, null);
  assert.equal(mapped.platform, null);
  assert.equal(mapped.post_type, null);
  assert.deepEqual(mapped.metadata, {});
}

// --- Structural: hook surfaces the failure instead of clearing the thread ---

const hook = read("hooks/use-ai-chat.ts");
const component = read("components/editor/PrometheusChat.tsx");
const mobile = read("components/editor/prometheus-chat-mobile.tsx");
const source = read("lib/supabase/chat-messages.ts");

// lib keeps the full SELECT on inserts and the typed record shape.
assert.ok(source.includes("client_message_id, created_at"));
assert.match(source, /export function isMissingClientMessageIdError/);
assert.match(source, /export function mapChatMessageRecord/);
assert.match(source, /export async function getChatMessages\(sessionId: string\)/);

// The hook exposes the additive error surface and retries the last attempt.
assert.match(hook, /import \{ toast \} from "sonner";/);
assert.match(hook, /const \[historyLoadError, setHistoryLoadError\] = useState<string \| null>\(null\)/);
assert.match(hook, /const lastLoadAttemptRef = useRef<string \| null>\(null\)/);
assert.match(hook, /const retryLoadSession = useCallback/);
assert.match(hook, /toast\.error\(/);
assert.match(hook, /^\s{4}historyLoadError,$/m);
assert.match(hook, /^\s{4}retryLoadSession,$/m);
assert.match(hook, /normalizePersistedMessageMetadata\(record\.metadata\)/);
assert.match(hook, /function normalizePersistedMessageMetadata/);
assert.match(hook, /metadata:\s*\{\s*\.\.\.\(streamFrames\.length/s);
assert.match(hook, /streamSuggestions\.length \? \{ suggestions: streamSuggestions \}/);

// The load path threads the last attempt through and clears the error on success.
assert.match(hook, /lastLoadAttemptRef\.current = sessionId/);
assert.match(hook, /setHistoryLoadError\(null\)/);
assert.match(hook, /isMissingClientMessageIdError\(err\)/);

// Silent-failure-by-design is gone: neither the loader nor the session switch
// clears messages before the fetch succeeds.
const loadBody = hook.slice(
  hook.indexOf("const loadSessionMessages"),
  hook.indexOf("}, []);", hook.indexOf("const loadSessionMessages")),
);
assert.equal(loadBody.includes("setMessages([])"), false, "loadSessionMessages must not pre-clear the thread");

const selectBody = hook.slice(
  hook.indexOf("const selectSession"),
  hook.indexOf("}, [loadSessionMessages, setActiveSessionId]);"),
);
assert.equal(selectBody.includes("setMessages([])"), false, "selectSession must not pre-clear the thread");
assert.ok(selectBody.includes("setHistoryLoadError(null)"), "selecting a session clears the stale error");

// Desktop + mobile surface a slim inline banner with a working Retry.
assert.match(component, /persistentChat\.historyLoadError/);
assert.match(component, /onClick=\{persistentChat\.retryLoadSession\}/);
assert.match(component, />\s*Retry\s*</);
assert.match(mobile, /chat\.historyLoadError/);
assert.match(mobile, /onClick=\{chat\.retryLoadSession\}/);

console.log("chat-history-load-regression: all assertions passed");
