import assert from "node:assert/strict";

import { PrometheusChatStreamDecoder } from "../lib/prometheus-assistant/chat-stream";
import { consumePrometheusChatStream } from "../lib/prometheus-assistant/chat-stream-client";

const decoder = new PrometheusChatStreamDecoder();

assert.deepEqual(decoder.push('{"type":"status","message":"Thinking"}\n{"type":"del'), [
  { type: "status", message: "Thinking" },
]);

assert.deepEqual(
  decoder.push('ta","content":"Hello "}\n{"type":"delta","content":"there"}\n'),
  [
    { type: "delta", content: "Hello " },
    { type: "delta", content: "there" },
  ],
);

assert.deepEqual(
  decoder.push(
    '{"type":"tool","toolCall":{"id":"tool-1","name":"search_prometheus_knowledge","label":"Search knowledge","status":"completed","summary":"3 guidance references matched."}}\n',
  ),
  [
    {
      type: "tool",
      toolCall: {
        id: "tool-1",
        name: "search_prometheus_knowledge",
        label: "Search knowledge",
        status: "completed",
        summary: "3 guidance references matched.",
      },
    },
  ],
);

assert.deepEqual(decoder.push('{"type":"done","persisted":true}'), []);
assert.deepEqual(decoder.flush(), [{ type: "done", persisted: true }]);

const malformedDecoder = new PrometheusChatStreamDecoder();
assert.deepEqual(
  malformedDecoder.push('not-json\n{"type":"error","message":"Try again"}\n'),
  [{ type: "error", message: "Try again" }],
);

const truncatedResponse = new Response(
  new ReadableStream({
    start(controller) {
      controller.enqueue(
        new TextEncoder().encode('{"type":"delta","content":"Partial"}\n'),
      );
      controller.close();
    },
  }),
  { status: 200 },
);

const thoughtResponse = new Response(
  new ReadableStream({
    start(controller) {
      controller.enqueue(
        new TextEncoder().encode('{"type":"thought","content":"Analyzing color balance..."}\n{"type":"done","persisted":true}\n'),
      );
      controller.close();
    },
  }),
  { status: 200 },
);

const receivedEvents: unknown[] = [];
consumePrometheusChatStream(thoughtResponse, (event) => receivedEvents.push(event)).then(() => {
  assert.deepEqual(receivedEvents, [
    { type: "thought", content: "Analyzing color balance..." },
    { type: "done", persisted: true },
  ]);
  console.log("Passed: consumePrometheusChatStream thought events test");
});

consumePrometheusChatStream(truncatedResponse, () => undefined).then(
  () => assert.fail("A truncated stream must not complete successfully."),
  (error: unknown) =>
    assert.match(error instanceof Error ? error.message : String(error), /interrupted/i),
);

