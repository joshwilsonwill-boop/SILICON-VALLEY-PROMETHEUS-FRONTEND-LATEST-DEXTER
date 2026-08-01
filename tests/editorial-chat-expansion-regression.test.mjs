import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();

function read(relativePath) {
  return readFileSync(join(root, relativePath), "utf8");
}

function run() {
  const editorPage = read("app/editor/[id]/page.tsx");
  const chatRoute = read("app/api/prometheus-chat/route.ts");
  const retrieval = read("lib/prometheus-assistant/retrieval.ts");

  const luxuryChat = read("components/editor/PrometheusChat.tsx");
  const elegistGreeting = read("components/editor/elegist-chat-greeting.tsx");

  assert.match(luxuryChat, /onClose\?: \(\) => void/);
  assert.match(luxuryChat, /aria-label="Collapse editorial chat"/);
  assert.doesNotMatch(luxuryChat, /prometheus-luxury-gradient-field/);
  assert.doesNotMatch(luxuryChat, /prometheusGradientDrift/);
  assert.match(luxuryChat, /aria-label="Scroll to latest response"/);
  assert.match(luxuryChat, /AIChatStreamingText/);
  assert.doesNotMatch(luxuryChat, /InlineLoadingAnimation|AIChatOrb/);
  assert.doesNotMatch(luxuryChat, /function PrometheusTypingOrbit/);
  assert.match(luxuryChat, /ElegistChatGreeting/);
  assert.match(elegistGreeting, /font-elegist/);
  assert.doesNotMatch(luxuryChat, /New chat|Generate Code|Launch App|UI Components|Theme Ideas|Image Assets/);

  assert.match(editorPage, /PrometheusChat/);
  assert.match(
    editorPage,
    /data-editorial-chat=\{isThreadOpen \? 'moon-expanded' : 'launcher'\}/,
  );
  assert.match(editorPage, /onClose=\{\(\) => \{/);
  assert.match(editorPage, /bg-black shadow-\[0_42px_120px/);
  assert.match(editorPage, /MessageCircle/);
  assert.match(editorPage, /rounded-full border border-white\/12/);
  assert.doesNotMatch(editorPage, />Relay<\/span>/);
  assert.match(editorPage, /function MagneticSparkleButton/);
  assert.doesNotMatch(editorPage, /AiLampDialog|setIsAiLampOpen|aiLampActions/);
  assert.doesNotMatch(editorPage, /clipPath: 'inset/);
  assert.doesNotMatch(editorPage, /round 999px/);
  assert.doesNotMatch(editorPage, /style-previews\/dark-cinematic-1\.jpg/);

  assert.match(
    editorPage,
    /function toStoredChatEntries\(entries: ChatEntry\[\]\): ChatEntry\[\]/,
  );
  assert.doesNotMatch(editorPage, /metadata: _metadata/);
  assert.doesNotMatch(
    editorPage,
    /const \{ metadata: _metadata, \.\.\.storedEntry \} = entry/,
  );

  assert.match(chatRoute, /Never reveal internal knowledge file names/);
  assert.match(chatRoute, /toKnowledgeToolPayload/);
  assert.doesNotMatch(chatRoute, /name: match\.source/);
  assert.doesNotMatch(chatRoute, /summary: 'Used local bundled PDF knowledge/);
  assert.doesNotMatch(chatRoute, /id: 'local-rag'/);

  assert.doesNotMatch(retrieval, /`File: \$\{match\.source\}`/);
  assert.doesNotMatch(retrieval, /`Chunk: \$\{match\.chunkIndex\}`/);
  assert.doesNotMatch(retrieval, /const sourceLine = `Sources:/);
}

run();
