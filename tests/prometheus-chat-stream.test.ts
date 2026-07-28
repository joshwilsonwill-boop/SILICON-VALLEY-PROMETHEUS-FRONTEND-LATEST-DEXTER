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

consumePrometheusChatStream(truncatedResponse, () => undefined).then(
  () => assert.fail("A truncated stream must not complete successfully."),
  (error: unknown) =>
    assert.match(error instanceof Error ? error.message : String(error), /interrupted/i),
);
