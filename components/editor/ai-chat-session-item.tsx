"use client";

import { Trash2 } from "lucide-react";

import type { ChatSession } from "@/lib/supabase/chat-sessions";
import { cn } from "@/lib/utils";

function formatSessionTimestamp(value: string) {
  const timestamp = new Date(value);
  const now = new Date();
  const sameDay = timestamp.toDateString() === now.toDateString();
  if (sameDay) return new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(timestamp);
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(timestamp);
}

export function AIChatSessionItem({
  active,
  disabled,
  onDelete,
  onSelect,
  session,
}: {
  active: boolean;
  disabled?: boolean;
  onDelete: (session: ChatSession) => void;
  onSelect: (session: ChatSession) => void;
  session: ChatSession;
}) {
  return (
    <div
      className={cn(
        "group flex items-center gap-2 rounded-xl border border-transparent bg-white/[0.03] p-3 transition-colors hover:border-white/[0.08] hover:bg-white/[0.06]",
        active && "border-white/[0.12] bg-white/[0.05]",
      )}
      data-active={active}
    >
      <button
        type="button"
        disabled={disabled}
        onClick={() => onSelect(session)}
        className="min-w-0 flex-1 text-left disabled:cursor-wait"
      >
        <p className="truncate text-sm font-medium text-white">{session.title}</p>
        <p className="mt-1 text-xs text-white/40">{formatSessionTimestamp(session.updated_at)}</p>
      </button>
      <button
        type="button"
        disabled={disabled}
        onClick={() => onDelete(session)}
        className="grid size-8 shrink-0 place-items-center rounded-lg text-red-400 opacity-100 transition-colors hover:bg-red-400/10 hover:text-red-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300/50 disabled:cursor-wait md:opacity-0 md:group-hover:opacity-100"
        aria-label={`Delete ${session.title}`}
      >
        <Trash2 className="size-4" aria-hidden="true" />
      </button>
    </div>
  );
}
