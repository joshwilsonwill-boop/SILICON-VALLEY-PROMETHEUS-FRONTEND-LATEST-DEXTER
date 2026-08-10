import assert from "node:assert/strict";

import {
  createLocalChatHistoryStore,
  isLocalChatSessionId,
} from "../lib/prometheus-assistant/local-chat-history";

class MemoryStorage {
  private readonly values = new Map<string, string>();

  getItem(key: string) {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string) {
    this.values.set(key, value);
  }

}

const storage = new MemoryStorage();
const store = createLocalChatHistoryStore(storage, "user-a");
const session = store.createSession("project-1");

assert.ok(isLocalChatSessionId(session.id));
assert.equal(store.getProjectSessions("project-1").length, 1);
assert.equal(store.getProjectSessions("project-2").length, 0);

const userMessage = store.insertMessage(session.id, {
  role: "user",
  content: "I want to edit the video that is there.",
  client_message_id: "user-1",
});
store.insertMessage(session.id, {
  role: "assistant",
  content: "I’ll inspect the opening and propose a concrete first pass.",
  client_message_id: "assistant-1",
  metadata: { transport: "local" },
});

assert.equal(userMessage.client_message_id, "user-1");
assert.deepEqual(
  store.getMessages(session.id).map((message) => message.role),
  ["user", "assistant"],
);
assert.equal(
  store.getProjectSessions("project-1")[0]?.title,
  "I want to edit the video that is there.",
);

const reloadedStore = createLocalChatHistoryStore(storage, "user-a");
assert.equal(reloadedStore.getMessages(session.id).length, 2);

reloadedStore.upsertSessions([{
  id: "remote-session-1",
  user_id: "remote-user-1",
  project_id: "project-1",
  title: "Remote chat mirrored locally",
  created_at: "2026-08-10T10:00:00.000Z",
  updated_at: "2026-08-10T10:00:00.000Z",
}]);
assert.equal(reloadedStore.getSession("remote-session-1")?.title, "Remote chat mirrored locally");

reloadedStore.upsertMessages([{
  id: "remote-message-1",
  client_message_id: "remote-client-message-1",
  session_id: "remote-session-1",
  role: "assistant",
  content: "Remote message mirrored locally",
  platform: null,
  post_type: null,
  metadata: {},
  created_at: "2026-08-10T10:00:01.000Z",
}]);
assert.equal(reloadedStore.getMessages("remote-session-1")[0]?.content, "Remote message mirrored locally");

const otherUserStore = createLocalChatHistoryStore(storage, "user-b");
assert.equal(otherUserStore.getSessions().length, 0);
assert.equal(otherUserStore.getMessages("remote-session-1").length, 0);

reloadedStore.updateSessionTitle(session.id, "Opening edit");
assert.equal(reloadedStore.getSession(session.id)?.title, "Opening edit");

reloadedStore.deleteMessages(session.id);
assert.equal(reloadedStore.getMessages(session.id).length, 0);

reloadedStore.deleteSession(session.id);
assert.equal(reloadedStore.getSession(session.id), null);
assert.equal(reloadedStore.getProjectSessions("project-1").length, 1);

const unavailableStore = createLocalChatHistoryStore({
  getItem: () => null,
  setItem: () => {
    throw new Error("storage blocked");
  },
}, "user-a");
assert.throws(
  () => unavailableStore.createSession("project-1"),
  /Local chat history could not be saved/,
);
