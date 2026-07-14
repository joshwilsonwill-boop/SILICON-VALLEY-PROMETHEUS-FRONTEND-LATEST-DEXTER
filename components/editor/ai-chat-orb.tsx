"use client";

import { motion } from "framer-motion";

import { cn } from "@/lib/utils";

export function AIChatOrb({ className }: { className?: string }) {
  return (
    <motion.span
      aria-hidden="true"
      animate={{ y: [0, -5, 0], scale: [1, 1.035, 1] }}
      transition={{ duration: 4, ease: "easeInOut", repeat: Infinity }}
      className={cn(
        "relative block size-16 shrink-0 rounded-full bg-[radial-gradient(circle_at_35%_30%,#86efac_0%,#4ade80_25%,#16a34a_60%,#14532d_100%)] shadow-[0_0_40px_rgba(74,222,128,0.25),0_0_80px_rgba(74,222,128,0.10)] md:size-20",
        className,
      )}
    >
      <span className="absolute left-[21%] top-[15%] size-[22%] rounded-full bg-white/40 blur-[1px]" />
    </motion.span>
  );
}
