"use client";

import { ArrowUp, Sparkles } from "lucide-react";
import { useEffect, useRef } from "react";

export function AIChatInput({
  disabled,
  onChange,
  onSend,
  onTopics,
  value,
}: {
  disabled: boolean;
  onChange: (value: string) => void;
  onSend: () => void;
  onTopics: () => void;
  value: string;
}) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
  }, [value]);

  return (
    <div className="border-t border-white/[0.06] bg-[#2c2c2e]/80 px-4 py-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)]">
      <div className="flex items-end gap-2.5">
        <button
          type="button"
          onClick={onTopics}
          className="mb-1 inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-xl px-2 text-xs text-white/60 transition-colors hover:text-white/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
          aria-label="Show suggested chat topics"
        >
          <Sparkles className="size-4 text-green-400" aria-hidden="true" />
          <span className="hidden sm:inline">Topics</span>
        </button>
        <textarea
          ref={textareaRef}
          value={value}
          rows={1}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              onSend();
            }
          }}
          placeholder="Ask me anything..."
          className="max-h-[120px] min-h-11 flex-1 resize-none rounded-2xl border border-white/[0.06] bg-white/[0.05] px-4 py-3 text-sm leading-5 text-white outline-none placeholder:text-white/30 focus:border-white/[0.15] focus:ring-1 focus:ring-white/5"
        />
        <button
          type="button"
          disabled={disabled || !value.trim()}
          onClick={onSend}
          className="mb-1 grid size-9 shrink-0 place-items-center rounded-full bg-white text-black shadow-md transition-transform hover:scale-110 active:scale-95 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
          aria-label="Send message"
        >
          <ArrowUp className="size-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
