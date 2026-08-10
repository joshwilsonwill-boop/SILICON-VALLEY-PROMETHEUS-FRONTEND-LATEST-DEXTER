import assert from "node:assert/strict";

import {
  classifyPrometheusChatIntent,
  createDirectPrometheusReply,
} from "../lib/prometheus-assistant/chat-intent";

const greeting = classifyPrometheusChatIntent("HI THERE");
assert.equal(greeting.kind, "conversation");
assert.equal(greeting.useKnowledge, false);
assert.equal(greeting.allowTools, false);
assert.match(createDirectPrometheusReply("HI THERE", greeting) ?? "", /^Hi\b/i);

const editingQuestion = classifyPrometheusChatIntent(
  "How should I pace the opening montage?",
);
assert.equal(editingQuestion.kind, "editing");
assert.equal(editingQuestion.useKnowledge, true);

const editorAction = classifyPrometheusChatIntent(
  "Cut the dead air and tighten the first scene.",
);
assert.equal(editorAction.kind, "editor-action");
assert.equal(editorAction.allowTools, true);

const naturalLanguageEditorAction = classifyPrometheusChatIntent(
  "I want to edit the video that is there.",
);
assert.equal(naturalLanguageEditorAction.kind, "editor-action");
assert.equal(naturalLanguageEditorAction.allowTools, true);

const socialRequest = classifyPrometheusChatIntent(
  "Write an Instagram caption and hashtags for this video.",
);
assert.equal(socialRequest.kind, "social-content");
assert.equal(socialRequest.useSocialStrategist, true);

const followUp = classifyPrometheusChatIntent("Can you explain that more clearly?");
assert.equal(followUp.kind, "conversation");
assert.equal(followUp.useKnowledge, false);
