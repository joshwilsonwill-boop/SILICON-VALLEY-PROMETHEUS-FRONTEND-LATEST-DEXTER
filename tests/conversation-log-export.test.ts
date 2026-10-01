import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { formatConversationLog } from "../lib/conversation-log";
import { getLiveTranscripts } from "../lib/voice-companion/transcription";

describe("conversation log export", () => {
  it("writes user and assistant turns in a compact readable format", () => {
    const output = formatConversationLog(
      [
        { role: "user", text: "Keep the first line exactly." },
        { role: "assistant", text: "I will keep it." },
      ],
      "Studio conversation",
      new Date("2026-10-01T12:00:00.000Z"),
    );

    assert.match(output, /^Studio conversation\nExported /);
    assert.match(output, /You\nKeep the first line exactly\./);
    assert.match(output, /Jarvis\nI will keep it\./);
  });

  it("does not add blank or system turns to the exported log", () => {
    const output = formatConversationLog([
      { role: "user", text: "  " },
      { role: "assistant", text: "Reply" },
    ]);

    assert.doesNotMatch(output, /You\n/);
    assert.match(output, /Jarvis\nReply/);
  });
});

describe("Gemini Live transcript events", () => {
  it("captures both the user's input transcript and Jarvis's output transcript", () => {
    assert.deepEqual(
      getLiveTranscripts({
        inputTranscription: { text: "User words" },
        outputTranscription: { text: "Jarvis words" },
        modelTurn: { parts: [{ text: "duplicate model text" }] },
      }),
      [
        { role: "user", text: "User words" },
        { role: "assistant", text: "Jarvis words" },
      ],
    );
  });

  it("uses text model parts as a fallback when output transcription is absent", () => {
    assert.deepEqual(
      getLiveTranscripts({ modelTurn: { parts: [{ text: "Text fallback" }] } }),
      [{ role: "assistant", text: "Text fallback" }],
    );
  });
});
