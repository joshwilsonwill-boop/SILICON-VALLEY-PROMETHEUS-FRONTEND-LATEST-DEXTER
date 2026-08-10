import assert from "node:assert/strict";

import { createLocalPrometheusFallback } from "../lib/prometheus-assistant/local-chat-fallback";

const editorFallback = createLocalPrometheusFallback({
  intentKind: "editor-action",
  projectTitle: "Launch film",
  filename: "launch-cut.mp4",
  durationSec: 18,
  playheadSec: 0,
});

assert.match(editorFallback, /launch-cut\.mp4/);
assert.match(editorFallback, /0:18/);
assert.match(editorFallback, /first pass/i);
assert.doesNotMatch(editorFallback, /tell me the outcome you want/i);

const recommendationFallback = createLocalPrometheusFallback({
  intentKind: "editor-action",
  projectTitle: "Interview",
  recommendation: {
    title: "Open on the strongest claim",
    rationale: "The first complete sentence has the clearest tension.",
  },
});
assert.match(recommendationFallback, /Open on the strongest claim/);
assert.match(recommendationFallback, /clearest tension/);

assert.equal(
  createLocalPrometheusFallback({
    intentKind: "conversation",
    knowledgeAnswer: "A J-cut brings in the next scene’s audio before its picture.",
  }),
  "A J-cut brings in the next scene’s audio before its picture.",
);
