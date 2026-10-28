"use client";

import { Download } from "lucide-react";

import { downloadConversationLog, type ConversationLogTurn } from "@/lib/conversation-log";
import { cn } from "@/lib/utils";

export function ConversationExportButton({
  turns,
  filename,
  title,
  assistantLabel,
  className,
  disabled,
}: {
  turns: ConversationLogTurn[];
  filename?: string;
  title?: string;
  assistantLabel?: string;
  className?: string;
  disabled?: boolean;
}) {
  const hasTurns = turns.some(
    (turn) => turn.text.trim().length > 0 || Boolean(turn.statusNote || turn.failureNotice),
  );

  return (
    <button
      type="button"
      onClick={() => downloadConversationLog(turns, filename, title, { assistantLabel })}
      disabled={disabled ?? !hasTurns}
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
