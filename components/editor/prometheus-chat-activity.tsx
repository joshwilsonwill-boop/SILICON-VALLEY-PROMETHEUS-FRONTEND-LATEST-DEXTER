"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Check, ChevronDown, CircleAlert, FileSearch, PanelTop, Sparkles, Wrench } from "lucide-react";
import { useMemo, useState } from "react";

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
      className="w-full max-w-2xl overflow-hidden rounded-lg border border-white/10 bg-[#101113] shadow-[0_18px_46px_-28px_rgba(0,0,0,0.9)]"
      aria-label="Prometheus is working"
      aria-live="polite"
    >
      <div className="flex items-center gap-3 px-3.5 py-3">
        <ThinkingMark active={!reduceMotion} />
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-2">
            <p className="truncate text-[13px] font-medium text-white/88">
              {activeStage?.label ?? "Assessing your request"}
            </p>
            {intent ? (
              <span className="shrink-0 rounded-full border border-[#9ff6e3]/20 bg-[#9ff6e3]/[0.07] px-2 py-0.5 text-[10px] font-medium text-[#b9fff0]/78">
                {intent}
              </span>
            ) : null}
          </div>
          <p className="mt-0.5 truncate text-[11px] text-white/40">
            {latestThought ?? "Building the right editorial context before answering."}
          </p>
        </div>
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
            className="overflow-hidden border-t border-white/[0.07]"
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
                  {stage.state === "active" ? <SkeletonLine /> : null}
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

function ThinkingMark({ active }: { active: boolean }) {
  return (
    <motion.span
      aria-hidden="true"
      className="relative grid size-9 shrink-0 place-items-center"
      animate={active ? { rotate: [0, 90, 180, 270, 360] } : undefined}
      transition={{ duration: 6, ease: "linear", repeat: Infinity }}
    >
      <span className="absolute inset-0 rounded-[12px] border border-[#9ff6e3]/22 bg-[conic-gradient(from_180deg,rgba(159,246,227,0.82),rgba(255,217,143,0.66),rgba(164,189,255,0.72),rgba(159,246,227,0.82))] opacity-80" />
      <span className="absolute inset-[2px] rounded-[10px] bg-[#101113]" />
      <motion.span
        animate={active ? { scale: [0.88, 1.12, 0.88], opacity: [0.45, 1, 0.45] } : undefined}
        transition={{ duration: 1.8, ease: "easeInOut", repeat: Infinity }}
        className="relative grid size-5 place-items-center rounded-md bg-[#9ff6e3]/12 text-[#b9fff0] shadow-[0_0_18px_rgba(159,246,227,0.25)]"
      >
        <Sparkles className="size-3.5" strokeWidth={1.5} />
      </motion.span>
    </motion.span>
  );
}

function SkeletonLine() {
  return (
    <motion.span
      aria-hidden="true"
      className="mt-2 h-1.5 w-10 rounded-full bg-[linear-gradient(90deg,rgba(255,255,255,0.08),rgba(159,246,227,0.55),rgba(255,255,255,0.08))]"
      animate={{ backgroundPositionX: ["0%", "200%"] }}
      transition={{ duration: 1.35, ease: "linear", repeat: Infinity }}
      style={{ backgroundSize: "200% 100%" }}
    />
  );
}

function StageIcon({ stage, active }: { stage: ActivityStage; active: boolean }) {
  if (stage.state === "active") return <ThinkingMark active={active} />;
  if (stage.state === "failed") return <CircleAlert className="mt-0.5 size-4 shrink-0 text-red-300/75" strokeWidth={1.5} />;
  if (stage.kind === "tool" && stage.label === "Search knowledge") return <FileSearch className="mt-0.5 size-4 shrink-0 text-[#b9fff0]/60" strokeWidth={1.5} />;
  if (stage.kind === "tool" && stage.label === "Reference frames") return <PanelTop className="mt-0.5 size-4 shrink-0 text-[#b9fff0]/60" strokeWidth={1.5} />;
  if (stage.kind === "tool") return <Wrench className="mt-0.5 size-4 shrink-0 text-white/42" strokeWidth={1.5} />;
  return <Check className="mt-0.5 size-4 shrink-0 text-[#b9fff0]/60" strokeWidth={1.5} />;
}
