import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { PrometheusChatLoadingSkeleton } from "../components/editor/prometheus-chat-loading-skeleton";
import { PrometheusChatMarkdown } from "../components/editor/prometheus-chat-markdown";
import { buildChatFollowUpSuggestions } from "../lib/prometheus-assistant/chat-follow-ups";

test("thinking indicator exposes a visible morph and flowing skeleton lines", () => {
  const markup = renderToStaticMarkup(<PrometheusChatLoadingSkeleton />);

  assert.match(markup, /role="status"/);
  assert.match(markup, /data-thinking-morph="circle-to-spark"/);
  assert.match(markup, /data-skeleton-flow="true"/);
});

test("assistant plans render GFM tables as semantic tables", () => {
  const markup = renderToStaticMarkup(
    <PrometheusChatMarkdown
      content={"| Step | Action |\n| --- | --- |\n| 1 | Review footage |"}
      isComplete
    />,
  );

  assert.match(markup, /<table/);
  assert.match(markup, /<th[^>]*>Step<\/th>/);
  assert.match(markup, /<td[^>]*>Review footage<\/td>/);
});

test("plan clarifications become concise contextual choices", () => {
  assert.deepEqual(
    buildChatFollowUpSuggestions(
      "Create an editorial plan",
      "Confirm target platform: YouTube, Instagram, TikTok, or website.",
    ),
    ["YouTube", "Instagram", "TikTok", "Website"],
  );
});

test("chat generation continues when the model stops at its token limit", () => {
  const route = readFileSync(join(process.cwd(), "app/api/prometheus-chat/stream/route.ts"), "utf8");

  assert.match(route, /finishReason !== "length"/);
  assert.match(route, /Continue exactly where the prior response stopped/);
  assert.match(route, /MAX_COMPLETION_PASSES = 3/);
});
