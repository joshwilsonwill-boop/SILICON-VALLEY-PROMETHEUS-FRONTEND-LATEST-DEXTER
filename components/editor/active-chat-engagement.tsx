"use client";

import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";
import { Captions, ChevronRight, Clapperboard, Music2, Sparkles } from "lucide-react";
import { useMemo } from "react";

import {
  resolveActiveEngagement,
  type ActiveEngagementKind,
} from "@/lib/prometheus-assistant/active-engagement";
import { cn } from "@/lib/utils";

const icons: Record<ActiveEngagementKind, typeof Clapperboard> = {
  cut: Clapperboard,
  hook: Sparkles,
  sound: Music2,
  captions: Captions,
};

export function ActiveChatEngagement({
  draft,
  workspaceTab,
  hasProject,
  onSelect,
  className,
}: {
  draft: string;
  workspaceTab?: string | null;
  hasProject: boolean;
  onSelect: (prompt: string) => void;
  className?: string;
}) {
  const prefersReducedMotion = useReducedMotion();
  const suggestions = useMemo(
    () => resolveActiveEngagement(draft, workspaceTab),
    [draft, workspaceTab],
  );

  if (!hasProject || suggestions.length === 0) return null;

  return (
    <motion.section
      aria-label="Active engagement suggestions"
      initial={prefersReducedMotion ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={prefersReducedMotion ? undefined : { opacity: 0, y: 6 }}
      transition={{ duration: 0.24, ease: "easeOut" }}
      className={cn(
        "relative overflow-hidden border-y border-white/[0.08] bg-[#090a0d]/94 py-2.5 shadow-[0_-18px_42px_-34px_rgba(0,0,0,0.96),inset_0_1px_0_rgba(255,255,255,0.04)]",
        className,
      )}
    >
      <div className="mx-auto flex w-full max-w-3xl items-center gap-3 px-5 md:px-10">
        <div className="relative hidden size-12 shrink-0 overflow-hidden border border-white/10 sm:block">
          <Image
            src="/library/people/dan-martell.png"
            alt="Current source visual"
            fill
            sizes="48px"
            className="object-cover opacity-75"
          />
          <span className="absolute inset-0 bg-black/30" aria-hidden="true" />
        </div>
        <div className="min-w-0 shrink-0">
          <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-white/42">Active engagement</p>
          <p className="mt-0.5 text-xs text-white/68">Reading your direction</p>
        </div>
        <div className="flex min-w-0 flex-1 gap-1.5 overflow-x-auto pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {suggestions.map((suggestion, index) => {
            const Icon = icons[suggestion.kind];
            return (
              <motion.button
                key={suggestion.id}
                type="button"
                onClick={() => onSelect(suggestion.prompt)}
                title={suggestion.detail}
                initial={prefersReducedMotion ? false : { opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.045, duration: 0.2, ease: "easeOut" }}
                whileHover={prefersReducedMotion ? undefined : { y: -1 }}
                whileTap={prefersReducedMotion ? undefined : { scale: 0.985 }}
                className="group flex h-10 shrink-0 items-center gap-2 border border-white/[0.1] bg-white/[0.035] px-3 text-left transition-[border-color,background-color] duration-300 hover:border-white/[0.26] hover:bg-white/[0.075] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
              >
                <Icon className="size-3.5 shrink-0 text-white/54 transition-colors group-hover:text-white/90" strokeWidth={1.5} />
                <span className="whitespace-nowrap text-xs font-medium text-white/75 group-hover:text-white">{suggestion.label}</span>
                <span className="text-[10px] tabular-nums text-white/32">{suggestion.confidence}%</span>
                <ChevronRight className="size-3.5 text-white/30 transition-transform group-hover:translate-x-0.5 group-hover:text-white/70" strokeWidth={1.5} />
              </motion.button>
            );
          })}
        </div>
      </div>
    </motion.section>
  );
}
