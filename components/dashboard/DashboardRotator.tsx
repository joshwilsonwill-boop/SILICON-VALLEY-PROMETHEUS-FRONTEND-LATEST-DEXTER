"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowRight } from "lucide-react";

import { LoadingAnimation } from "@/components/loading-animation";
import { useDashboardRotation } from "@/hooks/useDashboardRotation";

import { PinButton } from "./PinButton";
import { BlobGreeting } from "./views/BlobGreeting";
import { CinematicMorning } from "./views/CinematicMorning";
import { ExistingDashboard } from "./views/ExistingDashboard";
import { GeometricWorkspace } from "./views/GeometricWorkspace";

const viewMap = {
  existing: ExistingDashboard,
  geometric: GeometricWorkspace,
  blob: BlobGreeting,
  cinematic: CinematicMorning,
  tools: GeometricWorkspace,
};

export function DashboardRotator() {
  const { preset, pinned, ready, pin, unpin, cycle } = useDashboardRotation();
  const shouldReduceMotion = useReducedMotion();
  const View = viewMap[preset] || ExistingDashboard;

  if (!ready) {
    return <LoadingAnimation message="Loading... Preparing the studio." />;
  }

  return (
    <div className="relative h-full w-full overflow-hidden bg-chrome-950 text-text-primary">
      <AnimatePresence mode="wait">
        <motion.div
          key={preset}
          initial={shouldReduceMotion ? false : { opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 1.02 }}
          transition={{ duration: shouldReduceMotion ? 0 : 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="h-full w-full"
        >
          <View />
        </motion.div>
      </AnimatePresence>
      <div className="absolute right-6 top-6 z-30 flex items-center gap-2">
        <button
          type="button"
          onClick={cycle}
          className="glass-button flex h-8 items-center gap-1.5 rounded-lg px-3 text-xs text-text-secondary transition-all hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-cyan"
          aria-label={`Cycle dashboard preset. Current preset is ${preset}`}
        >
          <span className="font-mono text-[10px] uppercase tracking-wider">{preset}</span>
          <ArrowRight className="h-3 w-3 text-text-tertiary" />
        </button>
        <PinButton pinned={pinned} onPin={() => pin(preset)} onUnpin={unpin} />
      </div>
    </div>
  );
}
