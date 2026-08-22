"use client";

import { motion, useReducedMotion } from "framer-motion";

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
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.div
      role="group"
      aria-label={ariaLabel}
      className={cn(
        "grid gap-2",
        layout === "responsive" && "grid-cols-2 md:grid-cols-4",
        layout === "grid" && "grid-cols-2",
        layout === "row" && "grid-cols-4",
        className,
      )}
      initial={prefersReducedMotion ? false : "hidden"}
      animate="visible"
      variants={{
        hidden: {},
        visible: {
          transition: {
            staggerChildren: 0.07,
            delayChildren: 0.08,
          },
        },
      }}
    >
      {items.map((suggestion, index) => (
        <motion.button
          key={suggestion}
          type="button"
          onClick={() => onSelect(suggestion)}
          variants={{
            hidden: prefersReducedMotion
              ? {}
              : {
                  opacity: 0,
                  y: 26,
                  scale: 0.92,
                  filter: "blur(6px)",
                },
            visible: {
              opacity: 1,
              y: 0,
              scale: 1,
              filter: "blur(0px)",
            },
          }}
          transition={{
            y: { type: "spring", stiffness: 320, damping: 24, mass: 0.8 },
            opacity: { duration: 0.34, ease: [0.16, 1, 0.3, 1] },
            scale: { type: "spring", stiffness: 320, damping: 24, mass: 0.8 },
            filter: { duration: 0.4, ease: "easeOut" },
          }}
          whileHover={prefersReducedMotion ? undefined : { y: -2, scale: 1.02 }}
          whileTap={prefersReducedMotion ? undefined : { scale: 0.97, transition: { duration: 0.12 } }}
          className={cn(
            "group relative flex min-h-11 w-full items-center justify-center overflow-hidden rounded-full border border-white/[0.14] bg-white/[0.045] px-4 py-2.5 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_8px_24px_rgba(0,0,0,0.12)]",
            "text-[13px] font-medium leading-[1.25] text-white/68 transition-[background-color,border-color,color,box-shadow] duration-500",
            "hover:border-white/30 hover:bg-white/[0.09] hover:text-white/95 hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.16),0_12px_32px_rgba(0,0,0,0.2)]",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30",
          )}
        >
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-[-35%] top-0 h-px bg-gradient-to-r from-transparent via-white/55 to-transparent opacity-0 transition-[transform,opacity] duration-700 group-hover:translate-x-[70%] group-hover:opacity-100"
            style={{ transitionDelay: `${index * 35}ms` }}
          />
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/55 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100"
          />
          <span className="relative z-10 block w-full text-balance">{suggestion}</span>
        </motion.button>
      ))}
    </motion.div>
  );
}
