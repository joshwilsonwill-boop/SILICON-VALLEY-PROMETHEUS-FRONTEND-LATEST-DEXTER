"use client";

import { motion } from "framer-motion";
import { MessageSquare } from "lucide-react";

export function AIChatTriggerDesktop({ onOpen }: { onOpen: () => void }) {
  return (
    <motion.button
      type="button"
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{ type: "spring", stiffness: 320, damping: 20, delay: 0.3 }}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.95 }}
      onClick={onOpen}
      className="fixed bottom-6 right-6 z-50 hidden size-14 place-items-center rounded-full border border-white/[0.12] bg-white/[0.08] text-white shadow-lg shadow-green-500/10 backdrop-blur-xl transition-colors hover:bg-white/[0.12] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 md:grid"
      aria-label="Open AI Assistant"
    >
      <MessageSquare className="size-6" aria-hidden="true" />
    </motion.button>
  );
}
