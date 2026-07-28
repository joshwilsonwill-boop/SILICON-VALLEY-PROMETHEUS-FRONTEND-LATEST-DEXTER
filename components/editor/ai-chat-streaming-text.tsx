"use client";

import { useEffect, useRef, useState } from "react";

export interface StreamingTextProps {
  text: string;
  isComplete: boolean;
  speed?: number;
  live?: boolean;
  onComplete?: () => void;
  onProgress?: () => void;
}

export function AIChatStreamingText({
  text,
  isComplete,
  speed = 8,
  live = false,
  onComplete,
  onProgress,
}: StreamingTextProps) {
  const [displayedLength, setDisplayedLength] = useState(0);
  const displayedLengthRef = useRef(0);
  const completionNotifiedRef = useRef(false);

  useEffect(() => {
    displayedLengthRef.current = Math.min(displayedLengthRef.current, text.length);
    setDisplayedLength(displayedLengthRef.current);
    completionNotifiedRef.current = false;
  }, [text]);

  useEffect(() => {
    if (!isComplete) return;
    displayedLengthRef.current = text.length;
    setDisplayedLength(text.length);
    if (live && !completionNotifiedRef.current) {
      completionNotifiedRef.current = true;
      onComplete?.();
    }
  }, [isComplete, live, onComplete, text.length]);

  useEffect(() => {
    if (live || isComplete || displayedLengthRef.current >= text.length) return;

    let frameId = 0;
    let lastTick = 0;
    const tick = (timestamp: number) => {
      if (timestamp - lastTick >= speed) {
        const lag = text.length - displayedLengthRef.current;
        const chunkSize = Math.max(4, Math.min(18, Math.ceil(lag / 8)));
        const nextLength = Math.min(text.length, displayedLengthRef.current + chunkSize);
        displayedLengthRef.current = nextLength;
        setDisplayedLength(nextLength);
        onProgress?.();
        lastTick = timestamp;

        if (nextLength >= text.length) {
          if (!completionNotifiedRef.current) {
            completionNotifiedRef.current = true;
            onComplete?.();
          }
          return;
        }
      }
      frameId = requestAnimationFrame(tick);
    };

    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [isComplete, live, onComplete, onProgress, speed, text.length]);

  const visibleLength = live ? text.length : displayedLength;
  const isStreaming = !isComplete && (live || displayedLength < text.length);
  return (
    <>
      <span className={isComplete ? "text-white transition-opacity duration-200" : "text-white/90"}>
        {text.slice(0, visibleLength)}
      </span>
      {isStreaming ? <span className="ai-chat-streaming-cursor text-white/60">▋</span> : null}
      <style jsx global>{`
        @keyframes ai-chat-streaming-cursor-blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
        .ai-chat-streaming-cursor {
          animation: ai-chat-streaming-cursor-blink 1s step-end infinite;
        }
      `}</style>
    </>
  );
}
