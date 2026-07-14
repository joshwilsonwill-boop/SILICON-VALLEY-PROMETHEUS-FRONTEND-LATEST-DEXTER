"use client";

import { History } from "lucide-react";

export function AIChatHistoryButton({ onClick, unreadCount = 0 }: { onClick: () => void; unreadCount?: number }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="relative grid size-10 place-items-center rounded-full text-white/60 transition-colors hover:bg-white/[0.06] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
      aria-label="Open chat history"
    >
      <History className="size-5" aria-hidden="true" />
      {unreadCount > 0 ? <span className="absolute right-1.5 top-1.5 size-2 rounded-full bg-red-400" aria-hidden="true" /> : null}
    </button>
  );
}
