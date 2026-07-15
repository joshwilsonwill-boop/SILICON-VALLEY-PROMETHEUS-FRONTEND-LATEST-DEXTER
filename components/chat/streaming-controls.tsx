"use client";

import { Square } from "lucide-react";

export function StreamingControls({ isStreaming, onStop }: { isStreaming: boolean; onStop: () => void }) {
  if (!isStreaming) return null;

  return (
    <button type="button" onClick={onStop} className="grid size-8 place-items-center rounded-full bg-red-500 text-white hover:bg-red-400" aria-label="Stop generating">
      <Square className="size-3.5 fill-current" />
    </button>
  );
}
