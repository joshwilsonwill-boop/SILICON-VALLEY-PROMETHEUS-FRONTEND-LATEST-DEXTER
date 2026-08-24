"use client";

import { Clapperboard, Sparkles } from "lucide-react";

import type { AIChatVideoContext } from "@/hooks/use-ai-chat";
import { cn } from "@/lib/utils";

export function PrometheusChatContextBrief({
  context,
  onPrompt,
  className,
}: {
  context: AIChatVideoContext | null;
  onPrompt: (prompt: string) => void;
  className?: string;
}) {
  if (!context?.video) return null;

  const duration = context.video.durationMs
    ? `${Math.floor(context.video.durationMs / 60000)}:${String(Math.floor((context.video.durationMs % 60000) / 1000)).padStart(2, "0")}`
    : null;
  const pacing = context.editorialAnalysis?.pacing?.trim();

  return (
    <section className={cn("w-full max-w-xl text-left", className)} aria-label="Video context ready">
      <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.14em] text-[#b9fff0]/70">
        <span className="grid size-6 place-items-center rounded-md border border-[#9ff6e3]/20 bg-[#9ff6e3]/[0.07]">
          <Sparkles className="size-3.5" strokeWidth={1.5} />
        </span>
        Video brief ready
      </div>
      <h2 className="mt-3 text-xl font-medium leading-tight text-white/90">I have the footage in view.</h2>
      <p className="mt-1.5 text-sm leading-6 text-white/48">
        {context.editorialAnalysis?.summary?.trim() || "Start with the editorial direction, or ask for a specific adjustment."}
      </p>
      <div className="mt-4 flex flex-wrap gap-2 text-[11px] text-white/46">
        <span className="inline-flex items-center gap-1.5 rounded-md border border-white/[0.09] bg-white/[0.025] px-2.5 py-1.5">
          <Clapperboard className="size-3.5 text-white/52" strokeWidth={1.5} />
          <span className="max-w-48 truncate">{context.video.filename || "Source video"}</span>
        </span>
        {duration ? <span className="rounded-md border border-white/[0.09] bg-white/[0.025] px-2.5 py-1.5">{duration}</span> : null}
        {pacing ? <span className="rounded-md border border-white/[0.09] bg-white/[0.025] px-2.5 py-1.5">{pacing}</span> : null}
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" onClick={() => onPrompt("Assess the opening and tell me the strongest editorial direction.")}
          className="rounded-md border border-white/12 px-3 py-2 text-xs font-medium text-white/68 transition-colors hover:border-[#9ff6e3]/28 hover:bg-[#9ff6e3]/[0.07] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9ff6e3]/35">
          Assess the opening
        </button>
        <button type="button" onClick={() => onPrompt("Build an editorial plan for this video before we make any changes.")}
          className="rounded-md border border-white/12 px-3 py-2 text-xs font-medium text-white/68 transition-colors hover:border-[#9ff6e3]/28 hover:bg-[#9ff6e3]/[0.07] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9ff6e3]/35">
          Plan the edit
        </button>
      </div>
    </section>
  );
}
