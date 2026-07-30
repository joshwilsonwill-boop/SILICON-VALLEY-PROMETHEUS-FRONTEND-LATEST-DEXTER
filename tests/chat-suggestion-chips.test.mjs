import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (relativePath) => readFileSync(join(root, relativePath), "utf8");

const suggestionsSource = read("components/editor/ai-chat-suggestions.tsx");
const desktopSource = read("components/editor/PrometheusChat.tsx");
const mobileSource = read("components/editor/prometheus-chat-mobile.tsx");
const mobileInputSource = read("components/chat/mobile-chat-input.tsx");
const editorPageSource = read("app/editor/[id]/page.tsx");
const editorRouteShellSource = read("components/editor/EditorRouteShell.tsx");
const sidebarDrawerSource = read("app/editor/components/sidebar-drawer.tsx");
const hookSource = read("hooks/use-ai-chat.ts");
const streamSource = read("lib/prometheus-assistant/chat-stream.ts");

function countQuotedItems(source) {
  return [...source.matchAll(/"([^"]+)"/g)].length;
}

function extractTabItems(tab) {
  const table = suggestionsSource.match(
    /export const CHAT_SUGGESTIONS_BY_TAB:[\s\S]*?= \{([\s\S]*?)\n\};/,
  );
  assert.ok(table, "workspace suggestion table must exist");
  const items = table[1].match(new RegExp(`${tab}: \\[([\\s\\S]*?)\\]`));
  assert.ok(items, `${tab} suggestions must exist`);
  return countQuotedItems(items[1]);
}

for (const tab of ["Editor", "Music", "Motion"]) {
  assert.equal(extractTabItems(tab), 4, `${tab} must resolve to exactly four strings`);
}

const generic = suggestionsSource.match(
  /export const GENERIC_CHAT_SUGGESTIONS: string\[\] = \[([\s\S]*?)\n\];/,
);
assert.ok(generic, "generic suggestions must exist");
assert.equal(countQuotedItems(generic[1]), 4, "unknown/null tabs must resolve to four strings");
assert.match(suggestionsSource, /normalized === "editor"\) return "Editor"/);
assert.match(suggestionsSource, /normalized === "music"\) return "Music"/);
assert.match(suggestionsSource, /normalized === "motion"\) return "Motion"/);
assert.match(suggestionsSource, /CHAT_SUGGESTIONS_BY_TAB\[normalized\]/);
assert.match(suggestionsSource, /return GENERIC_CHAT_SUGGESTIONS/);

assert.match(suggestionsSource, /export function resolveChatSuggestions/);
assert.match(suggestionsSource, /hasProject/,
  "deterministic suggestions must react to project presence");
assert.match(suggestionsSource, /lastMessageRole/,
  "deterministic suggestions must react to the latest conversational turn");
assert.match(suggestionsSource, /NO_PROJECT_CHAT_SUGGESTIONS/);
assert.match(suggestionsSource, /FOLLOW_UP_SUGGESTIONS_BY_TAB/);
assert.match(suggestionsSource, /new Set<string>/, "stream suggestions must be de-duplicated");
assert.match(suggestionsSource, /while \(items\.length < 4/,
  "short stream payloads must be filled to four stable slots");
assert.match(suggestionsSource, /return items\.slice\(0, 4\)/,
  "stream suggestions must be capped at four");
assert.match(suggestionsSource, /layout === "responsive"/);
assert.match(suggestionsSource, /grid-cols-2 md:grid-cols-4/,
  "responsive layout must be mobile 2x2 and desktop one-row");
assert.match(suggestionsSource, /min-h-11/);
assert.match(suggestionsSource, /focus-visible:ring-2/);
assert.doesNotMatch(suggestionsSource, /overflow-x-(?:auto|scroll)/);
assert.doesNotMatch(suggestionsSource, /#[0-9a-f]{3,8}\b/i);

assert.match(desktopSource, /workspaceTab=\{workspaceTab\}/);
assert.match(desktopSource, /hasProject=\{Boolean\(projectId\)\}/);
assert.match(desktopSource, /lastMessageRole=\{lastMessage\?\.role\}/);
assert.match(desktopSource, /layout="responsive"/);
assert.match(desktopSource, /<ChatSuggestions[\s\S]*suggestionsHidden && "invisible pointer-events-none"/,
  "desktop must reserve suggestion layout space while generation hides the controls");
assert.match(desktopSource, /setDraft\(suggestion\)[\s\S]*inputRef\.current\?\.focus\(\)/);
assert.doesNotMatch(
  desktopSource.slice(
    desktopSource.indexOf("const handleSuggestionSelect"),
    desktopSource.indexOf("const scrollToLatest"),
  ),
  /sendMessage|onSend/,
);

assert.match(mobileSource, /workspaceTab=\{workspaceTab\}/);
assert.match(mobileSource, /hasProject=\{Boolean\(projectId\)\}/);
assert.match(mobileSource, /lastMessageRole=\{lastMessage\?\.role\}/);
assert.match(mobileSource, /layout="grid"/);
assert.match(mobileSource, /suggestionsHidden[\s\S]*invisible[\s\S]*ChatSuggestions/,
  "mobile must reserve suggestion layout space while generation hides the controls");
assert.match(mobileInputSource, /ref=\{inputRef\}/, "mobile composer must expose its textarea ref");
assert.match(mobileSource, /chat\.setDraft\(suggestion\)[\s\S]*composerInputRef\.current\?\.focus\(\)/);
assert.doesNotMatch(
  mobileSource.slice(
    mobileSource.indexOf("const handleSuggestionSelect"),
    mobileSource.indexOf("return ("),
  ),
  /sendMessage|onSend/,
);

assert.match(desktopSource, /persistentChat\.isSending \|\| persistentChat\.isAwaitingResponse/);
assert.match(mobileSource, /suggestionsHidden = chat\.isSending \|\| chat\.isAwaitingResponse/);
const mobileWorkspace = editorPageSource.slice(
  editorPageSource.indexOf("<MobileEditorView"),
  editorPageSource.indexOf("<EditorNewProjectUploadDialog", editorPageSource.indexOf("<MobileEditorView")),
);
const desktopWorkspace = editorPageSource.slice(
  editorPageSource.indexOf("key={`desktop-chat-${projectId}`}"),
  editorPageSource.indexOf("<EditorNewProjectUploadDialog", editorPageSource.indexOf("key={`desktop-chat-${projectId}`}")),
);
assert.match(mobileWorkspace, /workspaceTab=\{activeWorkspaceTab\}/);
assert.match(desktopWorkspace, /workspaceTab=\{activeWorkspaceTab\}/);
assert.match(editorRouteShellSource, /PrometheusChatMobile[\s\S]*workspaceTab="Editor"/,
  "route-shell mobile chat must receive an explicit workspace context");
assert.match(sidebarDrawerSource, /PrometheusChatMobile[\s\S]*workspaceTab="Editor"/,
  "legacy mobile drawer chat must receive an explicit workspace context");

assert.match(streamSource, /suggestions\?: unknown\[\]/);
assert.match(streamSource, /suggestions: Array\.isArray\(value\.suggestions\)/);
assert.match(hookSource, /normalizeSuggestionList\(event\.suggestions\)/);
assert.match(hookSource, /streamSuggestions\.length \? \{ suggestions: streamSuggestions \}/);
assert.match(hookSource, /normalizePersistedMessageMetadata\(record\.metadata\)/);
assert.match(hookSource, /const suggestions = normalizeSuggestionList\(metadata\.suggestions\)/);

console.log("chat-suggestion-chips: all assertions passed");
