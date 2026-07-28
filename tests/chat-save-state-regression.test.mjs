import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();

function read(relativePath) {
  return readFileSync(join(root, relativePath), "utf8");
}

function run() {
  const hook = read("hooks/use-ai-chat.ts");
  const component = read("components/editor/PrometheusChat.tsx");

  // The old blocking save-failure messages are gone for good
  assert.equal(
    hook.includes("The response is visible, but it could not be saved."),
    false,
  );
  assert.equal(
    hook.includes("This message is sending, but chat history could not be saved."),
    false,
  );
  assert.equal(
    component.includes("The response is visible, but it could not be saved."),
    false,
  );

  // All sends go through the streaming tools route
  assert.ok(hook.includes('fetch("/api/prometheus-chat/stream"'));

  // Live editor context is attached to every send via a provider callback
  assert.match(hook, /export type AIChatContextProvider = \(\) => AIChatLiveContext \| null/);
  assert.match(hook, /contextProvider\?:\s*AIChatContextProvider/);
  assert.match(hook, /contextProviderRef/);
  assert.match(hook, /editorContext/);
  assert.match(hook, /frameThumbs/);

  // Stream metadata (frames/toolCalls/actionDrafts) lands on the assistant message
  assert.match(hook, /normalizeFrameReferenceList/);
  assert.match(hook, /parseEditorActionDrafts/);
  assert.match(hook, /streamActionDrafts/);

  // Failed persistence is retriable instead of alarming the user
  assert.match(hook, /failedPersistRef/);
  assert.match(hook, /setSaveState\("error"\)/);
  assert.match(hook, /const retryPersist = useCallback/);
  assert.match(hook, /retryPersist,/);

  // UI shows a quiet chip with an inline Retry, never a takeover/error bubble
  assert.match(component, /Not saved/);
  assert.match(component, />\s*Retry\s*<\//);
  assert.match(component, /persistentChat\.retryPersist\(\)/);
}

run();
