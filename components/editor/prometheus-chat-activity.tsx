"use client";

import {
  Check,
  ChevronDown,
  CircleAlert,
  FileSearch,
  LoaderCircle,
  PanelTop,
  Wrench,
} from "lucide-react";
import { useState } from "react";

import type { AIChatActivity } from "@/hooks/use-ai-chat";
import { cn } from "@/lib/utils";

export function PrometheusChatActivity({
  entries,
  active,
}: {
  entries: AIChatActivity[];
  active: boolean;
}) {
  const [open, setOpen] = useState(true);
  const visibleEntries = entries.slice(-5);
  const activeEntry = [...visibleEntries]
    .reverse()
    .find((entry) => entry.state === "active");

  if (!active || visibleEntries.length === 0) return null;

  return (
    <section
      className="w-full max-w-xl border-l border-white/12 pl-3.5 text-left"
      aria-label="Live editorial process"
    >
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="flex w-full items-center gap-2 text-[11px] font-medium uppercase tracking-[0.14em] text-white/48 transition-colors hover:text-white/72 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
      >
        <ChevronDown
          className={cn("size-3 transition-transform", !open && "-rotate-90")}
          strokeWidth={1.5}
        />
        <span>Editorial process</span>
        {activeEntry ? (
          <span className="ml-auto truncate normal-case tracking-normal text-white/34">
            {activeEntry.label}
          </span>
        ) : null}
      </button>
      {open ? (
        <ol className="mt-3 space-y-2.5" aria-live="polite">
          {visibleEntries.map((entry) => (
            <li
              key={entry.id}
              className="flex min-w-0 items-start gap-2.5 text-[13px] leading-5"
            >
              <ActivityIcon entry={entry} />
              <div className="min-w-0">
                <p
                  className={cn(
                    "truncate",
                    entry.state === "active" ? "text-white/76" : "text-white/50",
                  )}
                >
                  {entry.label}
                </p>
                {entry.kind === "tool" ? (
                  <p className="mt-0.5 text-[11px] leading-4 text-white/32">
                    {entry.detail}
                  </p>
                ) : null}
              </div>
            </li>
          ))}
        </ol>
      ) : null}
    </section>
  );
}

function ActivityIcon({ entry }: { entry: AIChatActivity }) {
  if (entry.state === "active") {
    return (
      <LoaderCircle
        className="mt-0.5 size-3.5 shrink-0 animate-spin text-white/58 motion-reduce:animate-none"
        strokeWidth={1.5}
      />
    );
  }
  if (entry.state === "failed") {
    return <CircleAlert className="mt-0.5 size-3.5 shrink-0 text-red-300/70" strokeWidth={1.5} />;
  }
  if (entry.kind === "tool" && entry.label === "Search knowledge") {
    return <FileSearch className="mt-0.5 size-3.5 shrink-0 text-white/44" strokeWidth={1.5} />;
  }
  if (entry.kind === "tool" && entry.label === "Reference frames") {
    return <PanelTop className="mt-0.5 size-3.5 shrink-0 text-white/44" strokeWidth={1.5} />;
  }
  if (entry.kind === "tool") {
    return <Wrench className="mt-0.5 size-3.5 shrink-0 text-white/44" strokeWidth={1.5} />;
  }
  return <Check className="mt-0.5 size-3.5 shrink-0 text-white/36" strokeWidth={1.5} />;
}
