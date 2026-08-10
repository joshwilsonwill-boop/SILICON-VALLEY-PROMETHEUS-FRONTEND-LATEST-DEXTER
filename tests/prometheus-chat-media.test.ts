import assert from "node:assert/strict";
import { normalizeChatJob, normalizeChatMedia } from "../lib/prometheus-assistant/chat-media";

assert.deepEqual(normalizeChatMedia([{ kind: "frame", src: "/frame.jpg", seconds: 4.2 }]), [{
  id: "media-0", kind: "frame", url: "/frame.jpg", thumbnailUrl: undefined,
  title: undefined, description: undefined, seconds: 4.2, selectable: true,
}]);

assert.deepEqual(normalizeChatJob({ jobId: "j1", status: "processing", progress: 42 })?.state, "working");
assert.deepEqual(normalizeChatJob({ id: "j2", status: "failed", retryable: true })?.state, "retryable_error");
assert.deepEqual(normalizeChatJob({ id: "j3", status: "succeeded", result: { outputs: [{ kind: "video", url: "/done.mp4" }] } })?.result?.[0].kind, "video");
