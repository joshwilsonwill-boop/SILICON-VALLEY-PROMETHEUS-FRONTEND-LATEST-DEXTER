import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();

function read(relativePath) {
  return readFileSync(join(root, relativePath), "utf8");
}

function run() {
  const editorPage = read("app/editor/[id]/page.tsx");
  const route = read("app/api/prometheus-chat/route.ts");
  const tools = read("lib/prometheus-assistant/tools.ts");
  const retrieval = read("lib/prometheus-assistant/retrieval.ts");
  const knowledge = read("lib/prometheus-assistant/knowledge.generated.ts");
  const luxuryChatPath = "components/editor/PrometheusChat.tsx";

  assert.equal(existsSync(join(root, luxuryChatPath)), true);
  const luxuryChat = read(luxuryChatPath);

  assert.match(luxuryChat, /export type PrometheusChatMessage/);
  assert.match(luxuryChat, /messages:\s*PrometheusChatMessage\[\]/);
  assert.match(luxuryChat, /onSend:\s*\(message:\s*string\)/);
  assert.match(luxuryChat, /export function PrometheusChat/);
  assert.match(luxuryChat, /Ask Prometheus\.\.\./);
  assert.match(luxuryChat, /CinematicTextReveal/);
  assert.match(luxuryChat, /font-display/);
  assert.match(luxuryChat, /getChatGreeting/);
  assert.match(luxuryChat, /max-w-3xl/);
  assert.match(luxuryChat, /Collapse editorial chat/);
  assert.match(luxuryChat, /scrollViewportRef/);
  assert.match(luxuryChat, /aria-label="Scroll to latest response"/);
  assert.match(luxuryChat, /AIChatStreamingText/);
  assert.match(luxuryChat, /thinking/i);
  assert.match(luxuryChat, /demoMessages/);
  assert.doesNotMatch(luxuryChat, /AIChatOrb|SpectraNoiseFallback|LiquidMetalFallback/);
  assert.doesNotMatch(luxuryChat, /InlineLoadingAnimation|prometheus-luxury-gradient-field/);
  assert.doesNotMatch(luxuryChat, /New chat|Generate Code|Launch App|UI Components|Theme Ideas|Image Assets/);
  assert.doesNotMatch(luxuryChat, /ImageIcon|Mic|actions\.map/);
  assert.equal(editorPage.includes("md:w-[420px]"), false);
  assert.equal(editorPage.includes("lg:w-[420px]"), false);
  assert.equal(editorPage.includes("max-w-[420px]"), false);
  assert.match(editorPage, /z-\[120\]/);
  assert.match(editorPage, /setChatComposerPortal[\s\S]*z-\[120\]/);
  assert.match(
    editorPage,
    /data-editorial-chat=\{isThreadOpen \? 'moon-expanded' : 'launcher'\}/,
  );
  assert.match(editorPage, /md:h-\[calc\(100dvh-2rem\)\]/);
  assert.match(editorPage, /md:w-\[calc\(100vw-2rem\)\]/);
  assert.match(editorPage, /const chatPanelVariants: Variants/);
  assert.doesNotMatch(editorPage, /clipPath: 'inset/);
  assert.doesNotMatch(editorPage, /round 999px/);
  assert.match(editorPage, /PrometheusChat/);
  assert.match(editorPage, /editorOverlayMessages/);
  assert.match(editorPage, /function MagneticSparkleButton/);
  assert.match(editorPage, /MessageCircle/);
  assert.match(editorPage, /rounded-full border border-white\/12/);
  assert.doesNotMatch(editorPage, />Relay<\/span>/);
  assert.doesNotMatch(editorPage, /AiLampDialog|setIsAiLampOpen|aiLampActions/);
  assert.equal(editorPage.includes("Build something amazing"), false);

  assert.match(
    editorPage,
    /const endpoint = shouldEditRequest \? '\/api\/chat' : '\/api\/prometheus-chat'/,
  );
  assert.equal(
    editorPage.includes(
      "const endpoint = shouldEditRequest ? '/api/chat' : '/api/rag'",
    ),
    false,
  );

  assert.match(editorPage, /InlineLoadingAnimation/);
  assert.doesNotMatch(editorPage, /AiResponseLoader/);
  assert.match(editorPage, /function ChatToolCallGroup/);
  assert.match(editorPage, /function ChatFrameReferenceStrip/);
  assert.match(editorPage, /function ChatAttachmentStrip/);
  assert.equal(editorPage.includes("function ChatSkeletonLoader"), false);
  assert.equal(editorPage.includes("<ChatSkeletonLoader"), false);
  assert.match(editorPage, /<ChatToolCallGroup/);
  assert.match(editorPage, /<ChatFrameReferenceStrip/);
  assert.match(editorPage, /<ChatAttachmentStrip/);
  assert.match(editorPage, /readImageAttachment/);
  assert.match(editorPage, /pendingChatAttachments/);

  assert.match(
    editorPage,
    /const nextToolCalls = normalizeChatToolCalls\(payload\?\.toolCalls\)/,
  );
  assert.match(
    editorPage,
    /const nextFrames = normalizeChatFrames\(payload\?\.frames\)/,
  );
  assert.match(
    editorPage,
    /const nextAttachments = normalizeChatAttachments\(payload\?\.attachments\)/,
  );

  assert.match(route, /import Groq from 'groq-sdk'/);
  assert.match(tools, /const PROMETHEUS_TOOLS =/);
  assert.match(tools, /name: 'search_prometheus_knowledge'/);
  assert.match(tools, /name: 'reference_video_frames'/);
  assert.match(tools, /name: 'draft_editor_actions'/);
  assert.match(route, /const toolsEnabled = intent\.allowTools/);
  assert.match(route, /firstCompletionRequest\.tools = PROMETHEUS_TOOLS/);
  assert.match(route, /firstCompletionRequest\.tool_choice = 'auto'/);
  assert.match(route, /normalizeGroqToolCalls/);
  assert.match(route, /executePrometheusTool/);
  assert.match(route, /toolCalls: executedToolCalls/);
  assert.match(route, /actionDrafts: collectActionDrafts\(executedToolCalls\)/);
  assert.match(
    route,
    /frames: toFramePayload\(frameReferences, executedToolCalls\)/,
  );

  assert.match(retrieval, /PROMETHEUS_KNOWLEDGE_CHUNKS/);
  assert.match(retrieval, /export function retrievePrometheusKnowledge/);
  assert.match(retrieval, /export function formatKnowledgeContext/);
  assert.match(retrieval, /export function createExtractivePrometheusAnswer/);

  for (const source of [
    "01_prometheus_system_overview.pdf",
    "02_video_editing_best_practices.pdf",
    "03_user_scenarios_troubleshooting.pdf",
    "04_tool_calling_guide.pdf",
    "05_creative_workflows.pdf",
  ]) {
    assert.equal(knowledge.includes(`"source": "${source}"`), true, source);
  }
}

run();
