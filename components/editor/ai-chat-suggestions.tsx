"use client";

import { motion } from "framer-motion";

const suggestions = [
  "Generate a Twitter thread",
  "Create an Instagram carousel caption",
  "Write a LinkedIn thought leadership post",
  "Draft a TikTok script with hooks",
];

export function AIChatSuggestions({
  expanded = false,
  onSelect,
  onToggle,
}: {
  expanded?: boolean;
  onSelect: (suggestion: string) => void;
  onToggle?: () => void;
}) {
  const visibleSuggestions = expanded ? suggestions : suggestions.slice(0, 3);

  return (
    <div className="flex w-full flex-col items-end gap-2" aria-label="Suggested prompts">
      {visibleSuggestions.map((suggestion) => (
        <motion.button
          key={suggestion}
          type="button"
          whileHover={{ scale: 1.03, backgroundColor: "rgba(255,255,255,0.10)" }}
          whileTap={{ scale: 0.97 }}
          onClick={() => onSelect(suggestion)}
          className="max-w-full rounded-2xl border border-white/[0.06] bg-white/[0.06] px-4 py-2.5 text-right text-sm text-white/80 outline-none transition-colors hover:border-white/[0.12] focus-visible:ring-2 focus-visible:ring-white/30"
        >
          {suggestion}
        </motion.button>
      ))}
      {onToggle ? (
        <button
          type="button"
          onClick={onToggle}
          className="px-2 text-xs text-white/40 underline underline-offset-4 transition-colors hover:text-white/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
        >
          {expanded ? "Show less" : "Show more"}
        </button>
      ) : null}
    </div>
  );
}
