"use client";

import { useEffect, useRef, useState } from "react";

export interface StreamingTextProps {
  text: string;
  isComplete: boolean;
  speed?: number;
  onComplete?: () => void;
  onProgress?: () => void;
}

export function AIChatStreamingText({
  text,
  isComplete,
  speed = 15,
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
  }, [isComplete, text.length]);

  useEffect(() => {
    if (isComplete || displayedLengthRef.current >= text.length) return;

    let frameId = 0;
    let lastTick = 0;
    const tick = (timestamp: number) => {
      if (timestamp - lastTick >= speed) {
        const chunkSize = 1 + Math.floor(Math.random() * 3);
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
  }, [isComplete, onComplete, onProgress, speed, text.length]);

  const isStreaming = !isComplete && displayedLength < text.length;
  return (
    <>
      <span className={isComplete ? "text-white transition-opacity duration-200" : "text-white/90"}>
        {text.slice(0, displayedLength)}
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
