"use client";

import { motion } from "framer-motion";

export function AIChatTypingIndicator() {
  return (
    <div className="flex w-fit items-center gap-1 rounded-2xl rounded-tl-sm border border-white/[0.06] bg-white/[0.04] px-4 py-3" aria-label="AI Assistant is generating a response" role="status">
      {[0, 1, 2].map((index) => (
        <motion.span
          key={index}
          aria-hidden="true"
          animate={{ opacity: [0.3, 1, 0.3], y: [0, -2, 0] }}
          transition={{ duration: 1.2, delay: index * 0.2, repeat: Infinity }}
          className="size-1.5 rounded-full bg-green-400"
        />
      ))}
    </div>
  );
}
