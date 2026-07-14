"use client";

import { motion } from "framer-motion";

import type { AIChatMessage as AIChatMessageType } from "@/hooks/use-ai-chat";
import { cn } from "@/lib/utils";

import { AIChatStreamingText } from "./ai-chat-streaming-text";

export function AIChatMessage({
  message,
  onStreamingComplete,
  onStreamingProgress,
}: {
  message: AIChatMessageType;
  onStreamingComplete?: (messageId: string) => void;
  onStreamingProgress?: () => void;
}) {
  const isUser = message.role === "user";
  const label = message.platform
    ? `${message.platform === "twitter" ? "Twitter/X" : message.platform}${message.postType ? ` / ${message.postType}` : ""}`
    : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className={cn("flex flex-col gap-1.5", isUser ? "items-end" : "items-start")}
    >
      {label ? (
        <span className="rounded-full border border-green-400/20 bg-green-400/10 px-2 py-0.5 text-[10px] font-medium capitalize tracking-wide text-green-300">
          {label}
        </span>
      ) : null}
      <div
        className={cn(
          "max-w-[80%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm leading-relaxed",
          isUser
            ? "rounded-tr-sm bg-green-500/15 text-white"
            : "rounded-tl-sm border border-white/[0.06] bg-white/[0.04] text-white/90",
        )}
      >
          {isUser ? message.content : (
            <AIChatStreamingText
              text={message.content}
              isComplete={message.isComplete ?? true}
              onComplete={() => onStreamingComplete?.(message.id)}
              onProgress={onStreamingProgress}
            />
          )}
      </div>
      <time className="px-1 text-[10px] text-white/30" dateTime={message.createdAt}>
        {new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(
          new Date(message.createdAt),
        )}
      </time>
    </motion.div>
  );
}
