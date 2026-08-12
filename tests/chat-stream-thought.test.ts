import assert from "node:assert/strict";
import test, { describe } from "node:test";

import { PrometheusChatStreamDecoder } from "../lib/prometheus-assistant/chat-stream";

describe("PrometheusChatStreamDecoder Thought Events", () => {
  test("parses thought stream event cleanly", () => {
    const decoder = new PrometheusChatStreamDecoder();
    assert.deepEqual(
      decoder.push('{"type":"thought","content":"Evaluating timeline clips for tight cutpoints..."}\n'),
      [{ type: "thought", content: "Evaluating timeline clips for tight cutpoints..." }],
    );
  });

  test("buffers multiline partial thought chunks until newline", () => {
    const decoder = new PrometheusChatStreamDecoder();
    assert.deepEqual(
      decoder.push('{"type":"thought","content":"Checking frame 120'),
      [],
    );

    assert.deepEqual(
      decoder.push(' audio waveform..."}\n'),
      [{ type: "thought", content: "Checking frame 120 audio waveform..." }],
    );
  });
});
