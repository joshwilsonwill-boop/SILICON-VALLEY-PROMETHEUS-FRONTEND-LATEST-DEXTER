import assert from "node:assert/strict";
import test, { describe } from "node:test";

import { PrometheusChatStreamDecoder, type PrometheusChatStreamEvent } from "../lib/prometheus-assistant/chat-stream";
import { consumePrometheusChatStream } from "../lib/prometheus-assistant/chat-stream-client";

// ==========================================
// Test Helpers & Fixtures
// ==========================================
function streamResponse(chunks: (string | Uint8Array)[], status = 200): Response {
  return new Response(
    new ReadableStream({
      start(controller) {
        const encoder = new TextEncoder();
        for (const chunk of chunks) {
          if (typeof chunk === "string") {
            controller.enqueue(encoder.encode(chunk));
          } else {
            controller.enqueue(chunk);
          }
        }
        controller.close();
      },
    }),
    { status },
  );
}

function erroringStreamResponse(chunks: string[], streamError: Error, status = 200): Response {
  return new Response(
    new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        for (const chunk of chunks) {
          controller.enqueue(encoder.encode(chunk));
        }
        await new Promise((resolve) => setTimeout(resolve, 5));
        controller.error(streamError);
      },
    }),
    { status },
  );
}

// ==========================================
// 1. DECODER CONTRACT SUITE
// ==========================================
describe("PrometheusChatStreamDecoder Contract", () => {
  test("isolated instances parse standard status, thought, and delta events", () => {
    const decoder = new PrometheusChatStreamDecoder();
    const events = decoder.push(
      '{"type":"status","message":"Thinking"}\n{"type":"thought","content":"Analyzing visual flow..."}\n{"type":"delta","content":"Hello"}\n',
    );
    assert.deepEqual(events, [
      { type: "status", message: "Thinking" },
      { type: "thought", content: "Analyzing visual flow..." },
      { type: "delta", content: "Hello" },
    ]);
  });

  test("fuzzing: parses valid NDJSON split at EVERY possible character boundary", () => {
    const payload = '{"type":"thought","content":"Evaluating audio timeline..."}\n{"type":"delta","content":"Clean cut"}\n';

    for (let splitIdx = 1; splitIdx < payload.length; splitIdx++) {
      const decoder = new PrometheusChatStreamDecoder();
      const firstChunk = payload.slice(0, splitIdx);
      const secondChunk = payload.slice(splitIdx);

      const events1 = decoder.push(firstChunk);
      const events2 = decoder.push(secondChunk);
      const allEvents = [...events1, ...events2];

      assert.deepEqual(allEvents, [
        { type: "thought", content: "Evaluating audio timeline..." },
        { type: "delta", content: "Clean cut" },
      ], `Failed when split at index ${splitIdx}: "${firstChunk}" | "${secondChunk}"`);
    }
  });

  test("UTF-8 multibyte boundary splitting across chunks", () => {
    const encoder = new TextEncoder();
    const text = '{"type":"delta","content":"こんにちは 🌍"}\n';
    const bytes = encoder.encode(text);

    // Intentionally split in the middle of multibyte UTF-8 characters
    for (let splitPoint = 20; splitPoint < bytes.length - 5; splitPoint++) {
      const decoder = new PrometheusChatStreamDecoder();
      const textDecoder = new TextDecoder();

      const chunk1 = bytes.subarray(0, splitPoint);
      const chunk2 = bytes.subarray(splitPoint);

      // Verify TextDecoder streaming option preserves multibyte sequences
      const str1 = textDecoder.decode(chunk1, { stream: true });
      const str2 = textDecoder.decode(chunk2);

      const events1 = decoder.push(str1);
      const events2 = decoder.push(str2);
      const allEvents = [...events1, ...events2];

      assert.deepEqual(allEvents, [
        { type: "delta", content: "こんにちは 🌍" },
      ], `Failed UTF-8 multibyte split at byte index ${splitPoint}`);
    }
  });

  test("malformed JSON depth: garbage before valid, malformed between valid, and malformed at EOF", () => {
    const decoder = new PrometheusChatStreamDecoder();
    
    // Case A: Garbage before valid
    assert.deepEqual(decoder.push("not-json-garbage\n"), []);
    assert.deepEqual(decoder.push('{"type":"status","message":"Ready"}\n'), [
      { type: "status", message: "Ready" },
    ]);

    // Case B: Malformed between valid events
    assert.deepEqual(
      decoder.push('{"type":"delta","content":"A"}\n{bad-json}\n{"type":"delta","content":"B"}\n'),
      [
        { type: "delta", content: "A" },
        { type: "delta", content: "B" },
      ],
    );

    // Case C: Incomplete JSON at EOF
    assert.deepEqual(decoder.push('{"type":"delta","content":"Unfinished'), []);
    assert.deepEqual(decoder.flush(), []);
  });

  test("flush() behavior across empty buffer, complete newline, and trailing non-newline JSON", () => {
    // Empty buffer flush
    const decoder1 = new PrometheusChatStreamDecoder();
    assert.deepEqual(decoder1.flush(), []);

    // Complete line followed by flush
    const decoder2 = new PrometheusChatStreamDecoder();
    decoder2.push('{"type":"done","persisted":true}\n');
    assert.deepEqual(decoder2.flush(), []);

    // Trailing non-newline line completed via flush()
    const decoder3 = new PrometheusChatStreamDecoder();
    decoder3.push('{"type":"done","persisted":true}');
    assert.deepEqual(decoder3.flush(), [{ type: "done", persisted: true }]);
  });

  test("structured tool call payloads with completed, needs_approval, and failed statuses", () => {
    const decoder = new PrometheusChatStreamDecoder();
    const payload = [
      '{"type":"tool","toolCall":{"id":"t1","name":"search_knowledge","label":"Search","status":"completed","summary":"Matches found"}}\n',
      '{"type":"tool","toolCall":{"id":"t2","name":"draft_editor_actions","label":"Seek","status":"needs_approval","summary":"Seek to 12s"}}\n',
      '{"type":"tool","toolCall":{"id":"t3","name":"render_proof","label":"Render","status":"failed","summary":"Render timeout"}}\n',
    ].join("");

    assert.deepEqual(decoder.push(payload), [
      {
        type: "tool",
        toolCall: {
          id: "t1",
          name: "search_knowledge",
          label: "Search",
          status: "completed",
          summary: "Matches found",
        },
      },
      {
        type: "tool",
        toolCall: {
          id: "t2",
          name: "draft_editor_actions",
          label: "Seek",
          status: "needs_approval",
          summary: "Seek to 12s",
        },
      },
      {
        type: "tool",
        toolCall: {
          id: "t3",
          name: "render_proof",
          label: "Render",
          status: "failed",
          summary: "Render timeout",
        },
      },
    ]);
  });
});

// ==========================================
// 2. CLIENT CONTRACT SUITE
// ==========================================
describe("consumePrometheusChatStream Client Contract", () => {
  test("awaiting stream completes cleanly when terminal done event is received", async () => {
    const response = streamResponse([
      '{"type":"thought","content":"Thinking..."}\n',
      '{"type":"delta","content":"Final answer"}\n',
      '{"type":"done","persisted":true}\n',
    ]);

    const received: PrometheusChatStreamEvent[] = [];
    await consumePrometheusChatStream(response, (ev) => { received.push(ev); });

    assert.deepEqual(received, [
      { type: "thought", content: "Thinking..." },
      { type: "delta", content: "Final answer" },
      { type: "done", persisted: true },
    ]);
  });

  test("rejects using assert.rejects when stream ends before terminal done event", async () => {
    const responseWithoutDone = streamResponse([
      '{"type":"delta","content":"Incomplete payload"}\n',
    ]);

    await assert.rejects(
      consumePrometheusChatStream(responseWithoutDone, () => undefined),
      /interrupted/i,
    );
  });

  test("rejects HTTP 400, 401, and 500 error responses with server error message", async () => {
    const serverErrorResponse = new Response(
      JSON.stringify({ error: "Internal server capacity exceeded." }),
      { status: 500 },
    );

    await assert.rejects(
      consumePrometheusChatStream(serverErrorResponse, () => undefined),
      /Internal server capacity exceeded/i,
    );
  });

  test("rejects and reports connection failures when network stream errors mid-transmission", async () => {
    const networkErrorResponse = erroringStreamResponse(
      ['{"type":"delta","content":"Partial text"}\n'],
      new Error("TCP connection reset by peer"),
    );

    const receivedEvents: PrometheusChatStreamEvent[] = [];
    await assert.rejects(
      consumePrometheusChatStream(networkErrorResponse, (ev) => { receivedEvents.push(ev); }),
      /TCP connection reset by peer|interrupted/i,
    );

    // Delivered events prior to network collapse remain intact
    assert.deepEqual(receivedEvents, [
      { type: "delta", content: "Partial text" },
    ]);
  });

  test("event ordering preservation: status → thought → tool → delta → done", async () => {
    const response = streamResponse([
      '{"type":"status","message":"Init"}\n',
      '{"type":"thought","content":"Checking bounds"}\n',
      '{"type":"tool","toolCall":{"id":"1","name":"search","label":"Search","status":"completed","summary":"ok"}}\n',
      '{"type":"delta","content":"Result"}\n',
      '{"type":"done","persisted":true}\n',
    ]);

    const order: string[] = [];
    await consumePrometheusChatStream(response, (ev) => { order.push(ev.type); });

    assert.deepEqual(order, ["status", "thought", "tool", "delta", "done"]);
  });

  test("async callback backpressure: awaits async onEvent handlers sequentially", async () => {
    const response = streamResponse([
      '{"type":"delta","content":"Step 1"}\n',
      '{"type":"delta","content":"Step 2"}\n',
      '{"type":"done","persisted":true}\n',
    ]);

    const executionLog: string[] = [];
    await consumePrometheusChatStream(response, async (ev) => {
      executionLog.push(`start:${ev.type}`);
      await new Promise((resolve) => setTimeout(resolve, 10));
      executionLog.push(`end:${ev.type}`);
    });

    assert.deepEqual(executionLog, [
      "start:delta",
      "end:delta",
      "start:delta",
      "end:delta",
      "start:done",
      "end:done",
    ]);
  });
});
