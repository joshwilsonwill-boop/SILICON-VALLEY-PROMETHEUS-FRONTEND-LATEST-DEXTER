"use client";

import { Download } from "lucide-react";

import { downloadConversationLog, type ConversationLogTurn } from "@/lib/conversation-log";
import { cn } from "@/lib/utils";

export function ConversationExportButton({
  turns,
  filename,
  className,
}: {
  turns: ConversationLogTurn[];
  filename?: string;
  className?: string;
}) {
  const hasTurns = turns.some((turn) => turn.text.trim().length > 0);

  return (
    <button
      type="button"
      onClick={() => downloadConversationLog(turns, filename)}
      disabled={!hasTurns}
      aria-label="Download conversation log"
      title="Download conversation log"
      className={cn(
        "grid size-10 place-items-center rounded-full text-white/45 transition-colors hover:bg-white/[0.06] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30 disabled:cursor-not-allowed disabled:opacity-25",
        className,
      )}
    >
      <Download className="size-4" strokeWidth={1.6} />
    </button>
  );
}
