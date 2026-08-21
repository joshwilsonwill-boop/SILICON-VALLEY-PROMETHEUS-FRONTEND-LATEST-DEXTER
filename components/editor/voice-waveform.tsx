"use client";

import { Square } from "lucide-react";
import { useCallback, useEffect, useRef, useState, type RefObject } from "react";

import { cn } from "@/lib/utils";

const BAR_COUNT = 32;

// Eases a value toward a target, giving bars a smooth "fall" after spikes.
function ease(current: number, target: number, factor = 0.34) {
  return current + (target - current) * factor;
}

function formatElapsed(seconds: number) {
  const whole = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(whole / 60);
  const remainder = whole % 60;
  return `${minutes}:${String(remainder).padStart(2, "0")}`;
}

export function VoiceWaveform({
  getLevel,
  onStop,
  inputRef,
}: {
  getLevel: () => number | null;
  onStop: () => void;
  inputRef?: RefObject<HTMLInputElement | HTMLTextAreaElement | null>;
}) {
  const [elapsed, setElapsed] = useState(0);
  const levelsRef = useRef<number[]>(Array.from({ length: BAR_COUNT }, () => 0));
  const barRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const startRef = useRef<number | null>(null);

  // Recording timer.
  useEffect(() => {
    startRef.current = performance.now();
    const id = window.setInterval(() => {
      const start = startRef.current;
      if (start === null) return;
      setElapsed((performance.now() - start) / 1000);
    }, 250);
    return () => window.clearInterval(id);
  }, []);

  // Drive bars from live amplitude. We animate imperatively so the rAF loop
  // never triggers React re-renders; the timer above is the only re-render.
  useEffect(() => {
    let frame = 0;
    let disposed = false;

    const render = () => {
      if (disposed) return;
      const level = getLevel();
      const levels = levelsRef.current;
      const target = level ?? 0;
      const center = Math.floor(BAR_COUNT / 2);

      for (let index = 0; index < BAR_COUNT; index += 1) {
        const distance = Math.abs(index - center);
        const falloff = 1 - Math.min(1, distance / (BAR_COUNT / 2));
        const envelope = target * falloff;
        const noise = Math.abs(Math.sin(index * 0.7 + performance.now() * 0.004)) * 0.08;
        const previous = levels[index];
        const next = level === null ? ease(previous, 0.03) : ease(previous, Math.min(1, envelope + noise * (target > 0.06 ? 1 : 0.3)));
        levels[index] = next;

        const bar = barRefs.current[index];
        if (bar) bar.style.height = `${Math.max(6, next * 100)}%`;
      }

      frame = window.requestAnimationFrame(render);
    };

    frame = window.requestAnimationFrame(render);
    return () => {
      disposed = true;
      window.cancelAnimationFrame(frame);
    };
  }, [getLevel]);

  const handleStop = useCallback(() => {
    if (typeof inputRef?.current?.focus === "function") inputRef.current.focus();
    onStop();
  }, [inputRef, onStop]);

  return (
    <div className="flex h-12 w-full items-center gap-3">
      <div className="flex min-w-0 flex-1 items-center justify-center gap-[3px]" aria-hidden="true">
        {Array.from({ length: BAR_COUNT }, (_, index) => (
          <span
            key={index}
            ref={(node) => {
              barRefs.current[index] = node;
            }}
            className={cn("w-[3px] shrink-0 rounded-full", index === 0 || index === BAR_COUNT - 1 ? "bg-white/30" : "bg-white/85")}
            style={{ height: "6%" }}
          />
        ))}
      </div>
      <span className="shrink-0 font-mono text-xs tabular-nums text-white/40">{formatElapsed(elapsed)}</span>
      <button
        type="button"
        onClick={handleStop}
        aria-label="Stop recording"
        className="grid size-8 shrink-0 place-items-center rounded-full border border-white/15 bg-white/[0.04] text-white/80 transition-colors hover:border-white/30 hover:bg-white/[0.09] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
      >
        <Square className="size-3.5 fill-current" />
      </button>
    </div>
  );
}
