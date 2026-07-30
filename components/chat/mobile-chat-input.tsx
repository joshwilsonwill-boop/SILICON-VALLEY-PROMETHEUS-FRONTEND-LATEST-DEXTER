"use client";

import { Send } from "lucide-react";

import { StreamingControls } from "./streaming-controls";

export function MobileChatInput({
  isStreaming,
  onChange,
  onSend,
  onStop,
  value,
}: {
  isStreaming: boolean;
  onChange: (value: string) => void;
  onSend: () => void;
  onStop: () => void;
  value: string;
}) {
  return (
    <div className="shrink-0 bg-black px-4 pb-[calc(env(safe-area-inset-bottom)+0.875rem)] pt-3">
      <div className="mx-auto flex min-h-14 w-full max-w-xl items-end gap-2 rounded-2xl border border-white/10 bg-black px-4 py-2.5 focus-within:border-white/20">
        <textarea
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              onSend();
            }
          }}
          rows={1}
          placeholder="Ask Prometheus..."
          aria-label="Message Prometheus"
          className="max-h-24 min-h-8 flex-1 resize-none bg-transparent text-sm leading-6 text-white/88 outline-none placeholder:text-white/30"
        />
        {isStreaming ? (
          <StreamingControls isStreaming onStop={onStop} />
        ) : (
          <button
            type="button"
            onClick={onSend}
            disabled={!value.trim()}
            className="grid size-8 shrink-0 place-items-center rounded-full text-white/75 transition-colors hover:bg-white/[0.06] hover:text-white disabled:pointer-events-none disabled:opacity-20"
            aria-label="Send message"
          >
            <Send className="size-4" />
          </button>
        )}
      </div>
    </div>
  );
}