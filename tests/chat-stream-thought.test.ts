import assert from "node:assert/strict";

import { PrometheusChatStreamDecoder } from "../lib/prometheus-assistant/chat-stream";

const decoder = new PrometheusChatStreamDecoder();

// Test parsing of 'thought' event
assert.deepEqual(
  decoder.push('{"type":"thought","content":"Evaluating timeline clips for tight cutpoints..."}\n'),
  [{ type: "thought", content: "Evaluating timeline clips for tight cutpoints..." }],
);

// Test parsing of 'thought' with multiline/partial chunks
assert.deepEqual(
  decoder.push('{"type":"thought","content":"Checking frame 120'),
  [],
);

assert.deepEqual(
  decoder.push(' audio waveform..."}\n'),
  [{ type: "thought", content: "Checking frame 120 audio waveform..." }],
);

console.log("Passed: chat stream thought event tests");
