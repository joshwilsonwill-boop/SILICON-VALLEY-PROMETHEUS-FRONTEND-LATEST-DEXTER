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

export function getChatSuggestionsForWorkspaceTab(tab?: string | null): string[] {
  const normalized = tab?.trim().toLowerCase();
  if (normalized === "editor") return CHAT_SUGGESTIONS_BY_TAB.Editor;
  if (normalized === "music") return CHAT_SUGGESTIONS_BY_TAB.Music;
  if (normalized === "motion") return CHAT_SUGGESTIONS_BY_TAB.Motion;
  return GENERIC_CHAT_SUGGESTIONS;
}

export function ChatSuggestions({
  workspaceTab = null,
  suggestions,
  onSelect,
  layout = "row",
  className,
  ariaLabel = "Suggested prompts",
}: {
  /** Active workspace tab; drives the deterministic default chips. */
  workspaceTab?: string | null;
  /** Stream-provided suggestions override the deterministic defaults. */
  suggestions?: string[];
  /** Clicking a chip hands the text back; the caller fills the draft (never auto-sends). */
  onSelect: (suggestion: string) => void;
  /** row: 4 equal-width columns (desktop). grid: 2x2 (mobile). */
  layout?: "row" | "grid";
  className?: string;
  ariaLabel?: string;
}) {
  const items = (suggestions && suggestions.length > 0
    ? suggestions
    : getChatSuggestionsForWorkspaceTab(workspaceTab)
  ).slice(0, 4);

  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className={cn("grid gap-2", layout === "grid" ? "grid-cols-2" : "grid-cols-4", className)}
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
