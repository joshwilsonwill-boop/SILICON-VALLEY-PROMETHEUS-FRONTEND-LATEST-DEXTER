"use client";

import { cn } from "@/lib/utils";

export type ChatSuggestionsWorkspaceTab = "Editor" | "Music" | "Motion";

// Deterministic, jargon-free default chips. Exactly 4 per workspace tab so the
// desktop row stays symmetric and the mobile 2x2 grid stays balanced.
export const CHAT_SUGGESTIONS_BY_TAB: Record<ChatSuggestionsWorkspaceTab, string[]> = {
  Editor: [
    "Tighten my intro pacing",
    "Suggest a hook for this clip",
    "Pick a music mood",
    "Make my captions pop",
  ],
  Music: [
    "Find a track that fits this scene",
    "Make the chorus hit harder",
    "Suggest a calmer soundtrack",
    "Fade the music out at the end",
  ],
  Motion: [
    "Add motion to my title card",
    "Suggest a transition for this cut",
    "Make my text animate in",
    "Smooth out this animation",
  ],
};

// Fallback set when no workspace tab context is available (e.g. mobile chat).
export const GENERIC_CHAT_SUGGESTIONS: string[] = [
  "Give me three ways to improve this video",
  "Suggest a hook for this clip",
  "Pick a music mood",
  "Make my captions pop",
];

export const NO_PROJECT_CHAT_SUGGESTIONS: string[] = [
  "Help me shape a new video",
  "Plan a strong opening",
  "Choose a visual direction",
  "Build a simple edit brief",
];

export const FOLLOW_UP_SUGGESTIONS_BY_TAB: Record<ChatSuggestionsWorkspaceTab, string> = {
  Editor: "Apply that direction to my cut",
  Music: "Refine that soundtrack direction",
  Motion: "Turn that into a motion pass",
};

type ChatMessageRole = "user" | "assistant" | "system";

function normalizeWorkspaceTab(tab?: string | null): ChatSuggestionsWorkspaceTab | null {
  const normalized = tab?.trim().toLowerCase();
  if (normalized === "editor") return "Editor";
  if (normalized === "music") return "Music";
  if (normalized === "motion") return "Motion";
  return null;
}

export function getChatSuggestionsForWorkspaceTab(tab?: string | null): string[] {
  const normalized = normalizeWorkspaceTab(tab);
  if (normalized) return CHAT_SUGGESTIONS_BY_TAB[normalized];
  return GENERIC_CHAT_SUGGESTIONS;
}

export function getContextualChatSuggestions(
  workspaceTab?: string | null,
  hasProject = true,
  lastMessageRole?: ChatMessageRole | null,
): string[] {
  if (!hasProject) return NO_PROJECT_CHAT_SUGGESTIONS;

  const defaults = getChatSuggestionsForWorkspaceTab(workspaceTab);
  if (lastMessageRole !== "assistant") return defaults;

  const normalized = normalizeWorkspaceTab(workspaceTab);
  const followUp = normalized
    ? FOLLOW_UP_SUGGESTIONS_BY_TAB[normalized]
    : "Take that direction one step further";
  return [followUp, ...defaults.slice(1)];
}

export function resolveChatSuggestions(
  workspaceTab?: string | null,
  suggestions?: string[],
  hasProject = true,
  lastMessageRole?: ChatMessageRole | null,
): string[] {
  const defaults = getContextualChatSuggestions(workspaceTab, hasProject, lastMessageRole);
  const items: string[] = [];
  const seen = new Set<string>();

  for (const candidate of [...(suggestions ?? []), ...defaults]) {
    const suggestion = candidate.trim();
    if (!suggestion || seen.has(suggestion)) continue;
    seen.add(suggestion);
    items.push(suggestion);
    if (items.length === 4) break;
  }

  let fallbackIndex = 0;
  while (items.length < 4 && fallbackIndex < GENERIC_CHAT_SUGGESTIONS.length) {
    const suggestion = GENERIC_CHAT_SUGGESTIONS[fallbackIndex];
    fallbackIndex += 1;
    if (seen.has(suggestion)) continue;
    seen.add(suggestion);
    items.push(suggestion);
  }

  return items.slice(0, 4);
}

export function ChatSuggestions({
  workspaceTab = null,
  suggestions,
  hasProject = true,
  lastMessageRole = null,
  onSelect,
  layout = "responsive",
  className,
  ariaLabel = "Suggested prompts",
}: {
  /** Active workspace tab; drives the deterministic default chips. */
  workspaceTab?: string | null;
  /** Stream-provided suggestions override the deterministic defaults. */
  suggestions?: string[];
  hasProject?: boolean;
  lastMessageRole?: ChatMessageRole | null;
  /** Clicking a chip hands the text back; the caller fills the draft (never auto-sends). */
  onSelect: (suggestion: string) => void;
  /** responsive: 2x2 mobile / one row desktop. row and grid support fixed chambers. */
  layout?: "responsive" | "row" | "grid";
  className?: string;
  ariaLabel?: string;
}) {
  const items = resolveChatSuggestions(workspaceTab, suggestions, hasProject, lastMessageRole);

  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className={cn(
        "grid gap-2",
        layout === "responsive" && "grid-cols-2 md:grid-cols-4",
        layout === "grid" && "grid-cols-2",
        layout === "row" && "grid-cols-4",
        className,
      )}
    >
      {items.map((suggestion) => (
        <button
          key={suggestion}
          type="button"
          onClick={() => onSelect(suggestion)}
          className={cn(
            "flex min-h-11 items-center justify-center rounded-full border border-white/10 bg-white/[0.035] px-4 py-2 text-center",
            "text-[13px] leading-snug text-white/62",
            "transition-[background-color,border-color,color,transform] duration-[var(--dur-hover)] ease-[var(--ease-hover)]",
            "hover:border-white/18 hover:bg-white/[0.06] hover:text-white/86",
            "active:scale-[0.98] active:duration-[var(--dur-press)]",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30",
          )}
        >
          {suggestion}
        </button>
      ))}
    </div>
  );
}
