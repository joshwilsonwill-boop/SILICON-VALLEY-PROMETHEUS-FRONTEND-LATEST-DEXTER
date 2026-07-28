import assert from "node:assert/strict";

import {
  groupChatSessions,
  splitChatSessionTitle,
} from "../lib/prometheus-assistant/chat-history";

const now = new Date("2026-07-28T12:00:00.000Z");
const sessions = [
  { id: "today", title: "Tighten the opening", updated_at: "2026-07-28T09:00:00.000Z" },
  { id: "yesterday", title: "Build a launch cut", updated_at: "2026-07-27T09:00:00.000Z" },
  { id: "week", title: "Music direction", updated_at: "2026-07-23T09:00:00.000Z" },
  { id: "older", title: "Archive pass", updated_at: "2026-06-01T09:00:00.000Z" },
];

assert.deepEqual(
  groupChatSessions(sessions, now).map((group) => [
    group.label,
    group.sessions.map((session) => session.id),
  ]),
  [
    ["Today", ["today"]],
    ["Yesterday", ["yesterday"]],
    ["Previous 7 days", ["week"]],
    ["Older", ["older"]],
  ],
);

assert.deepEqual(splitChatSessionTitle("  Tighten   the opening  "), [
  "Tighten",
  "the",
  "opening",
]);
