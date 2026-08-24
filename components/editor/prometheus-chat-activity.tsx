"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Check, ChevronDown, CircleAlert, FileSearch, PanelTop, Wrench } from "lucide-react";
import { useMemo, useState } from "react";

import { PrometheusChatLoadingSkeleton } from "@/components/editor/prometheus-chat-loading-skeleton";
import type { AIChatActivity } from "@/hooks/use-ai-chat";
import { cn } from "@/lib/utils";

type ActivityStage = {
  id: string;
  label: string;
  detail?: string;
  state: "active" | "complete" | "completed" | "failed" | "needs_approval";
  kind: "status" | "tool";
};

export function PrometheusChatActivity({
  entries,
  active,
  intent,
  thoughts = [],
}: {
  entries: AIChatActivity[];
  active: boolean;
  intent?: string | null;
  thoughts?: string[];
}) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const reduceMotion = useReducedMotion();
  const stages = useMemo<ActivityStage[]>(
    () => entries.slice(-4).map((entry) => ({
      id: entry.id,
      label: entry.label,
      detail: entry.kind === "tool" ? entry.detail : undefined,
      state: entry.state,
      kind: entry.kind,
    })),
    [entries],
  );
  const activeStage = [...stages].reverse().find((stage) => stage.state === "active");
  const latestThought = thoughts.at(-1);

  if (!active) return null;

  return (
    <motion.section
      initial={reduceMotion ? false : { opacity: 0, y: 8, filter: "blur(8px)" }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      transition={{ duration: reduceMotion ? 0 : 0.28, ease: [0.22, 1, 0.36, 1] }}
      className="w-full max-w-md"
      aria-label="Live editorial process"
      aria-live="polite"
    >
      <div className="flex items-center gap-2">
        <PrometheusChatLoadingSkeleton
          label={activeStage?.label ?? latestThought ?? "Assessing your request"}
          className="max-w-[18rem]"
        />
        <button
          type="button"
          onClick={() => setDetailsOpen((value) => !value)}
          aria-expanded={detailsOpen}
          className="grid size-8 shrink-0 place-items-center rounded-md text-white/42 transition-colors hover:bg-white/[0.06] hover:text-white/78 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9ff6e3]/35"
          aria-label={detailsOpen ? "Hide live process details" : "Show live process details"}
        >
          <ChevronDown className={cn("size-4 transition-transform", detailsOpen && "rotate-180")} strokeWidth={1.5} />
        </button>
      </div>

      <AnimatePresence initial={false}>
        {detailsOpen ? (
          <motion.div
            initial={reduceMotion ? false : { height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={reduceMotion ? undefined : { height: 0, opacity: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.22, ease: "easeOut" }}
            className="overflow-hidden border-t border-white/[0.07] pt-2"
          >
            <ol className="space-y-1 px-3.5 py-3">
              {stages.map((stage) => (
                <li key={stage.id} className="flex min-w-0 items-start gap-2.5 py-1">
                  <StageIcon stage={stage} active={active} />
                  <div className="min-w-0 flex-1">
                    <p className={cn("text-[12px] leading-5", stage.state === "active" ? "text-white/82" : "text-white/52")}>
                      {stage.label}
                    </p>
                    {stage.detail ? <p className="text-[11px] leading-4 text-white/34">{stage.detail}</p> : null}
                  </div>
                  {stage.state === "active" ? <span className="mt-2 h-1.5 w-10 rounded-full bg-white/20" /> : null}
                </li>
              ))}
            </ol>
            {thoughts.length > 1 ? (
              <div className="border-t border-white/[0.06] px-3.5 py-2.5">
                <p className="text-[10px] uppercase tracking-[0.14em] text-white/30">Context considered</p>
                <p className="mt-1 text-[11px] leading-4 text-white/46">{thoughts.slice(-3).join("  /  ")}</p>
              </div>
            ) : null}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </motion.section>
  );
}

function StageIcon({ stage, active }: { stage: ActivityStage; active: boolean }) {
  if (stage.state === "active") return <span className="mt-0.5 size-4 shrink-0 rounded-full border border-white/30 border-l-white/10" />;
  if (stage.state === "failed") return <CircleAlert className="mt-0.5 size-4 shrink-0 text-red-300/75" strokeWidth={1.5} />;
  if (stage.kind === "tool" && stage.label === "Search knowledge") return <FileSearch className="mt-0.5 size-4 shrink-0 text-[#b9fff0]/60" strokeWidth={1.5} />;
  if (stage.kind === "tool" && stage.label === "Reference frames") return <PanelTop className="mt-0.5 size-4 shrink-0 text-[#b9fff0]/60" strokeWidth={1.5} />;
  if (stage.kind === "tool") return <Wrench className="mt-0.5 size-4 shrink-0 text-white/42" strokeWidth={1.5} />;
  return <Check className="mt-0.5 size-4 shrink-0 text-[#b9fff0]/60" strokeWidth={1.5} />;
}
