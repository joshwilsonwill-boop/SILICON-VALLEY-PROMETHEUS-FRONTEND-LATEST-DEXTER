"use client";

import { useEffect, useRef, useState } from "react";
import { Brain, Pause, Play, Sparkles } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";

import { InlineLoadingAnimation } from "@/components/loading-animation";
import { cn } from "@/lib/utils";
import { useDeviceTier } from "@/hooks/useDeviceTier";

import { BeatMapper } from "./BeatMapper";
import { SemanticVectorGrid } from "./SemanticVectorGrid";

interface Beat {
  id: string;
  time: number;
  word: string;
  type: "emphasis" | "build" | "climax";
  intensity: number;
}

const generatedBeats: Beat[] = [
  { id: "1", time: 0.7, word: "Prometheus", type: "emphasis", intensity: 0.9 },
  { id: "2", time: 1.6, word: "future", type: "build", intensity: 0.7 },
  { id: "3", time: 2.4, word: "content", type: "climax", intensity: 1 },
];

const semanticVectors = [
  { word: "Welcome", timestamp: 0, embedding: [0.31, 0.12, 0.28, 0.22] },
  { word: "to", timestamp: 0.5, embedding: [0.08, 0.06, 0.05, 0.04] },
  { word: "Prometheus", timestamp: 0.7, embedding: [0.92, 0.45, 0.38, 0.74] },
  { word: "future", timestamp: 1.6, embedding: [0.69, 0.61, 0.2, 0.52] },
  { word: "content", timestamp: 2.4, embedding: [0.78, 0.7, 0.54, 0.66] },
  { word: "motion", timestamp: 3.1, embedding: [0.42, 0.88, 0.63, 0.35] },
  { word: "export", timestamp: 4.2, embedding: [0.5, 0.3, 0.82, 0.44] },
  { word: "signal", timestamp: 5.4, embedding: [0.38, 0.77, 0.7, 0.29] },
];

export function MotionBrainPanel() {
  const [processing, setProcessing] = useState(false);
  const [beats, setBeats] = useState<Beat[]>([]);
  const [playing, setPlaying] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const shouldReduceMotion = useReducedMotion();
  const tier = useDeviceTier();
  const staticFallback = tier === "low" || shouldReduceMotion;

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const run = () => {
    setProcessing(true);

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      setBeats(generatedBeats);
      setProcessing(false);
      setPlaying(!staticFallback);
    }, staticFallback ? 600 : 2000);
  };

  return (
    <div className="flex h-full w-80 flex-col border-l border-border-subtle glass-panel">
      <div className="flex h-14 items-center gap-2 border-b border-border-subtle px-4">
        <Brain className="h-5 w-5 text-accent-cyan" />
        <span className="font-display text-sm font-medium chrome-text">Motion Brain</span>
      </div>
      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        <button
          onClick={run}
          disabled={processing}
          className="flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-accent-cyan/30 bg-accent-cyan-glow py-3 text-sm text-accent-cyan transition-all hover:shadow-glow-cyan disabled:opacity-50"
        >
          {processing ? (
            <>
              <InlineLoadingAnimation size={16} label="Analyzing motion beats" /> Analyzing...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" /> Generate Beats
            </>
          )}
        </button>

        <div className="rounded-lg border border-border-subtle bg-surface-elevated p-3">
          <div
            ref={previewRef}
            className="mx-auto flex h-16 w-16 items-center justify-center rounded-xl border border-accent-cyan/30 bg-accent-cyan-glow text-accent-cyan shadow-glow-cyan"
          >
            <Brain className="h-7 w-7" />
          </div>
          {playing && <BeatMapper beats={beats} targetRef={previewRef} />}
        </div>

        <SemanticVectorGrid vectors={semanticVectors} />

        <div className="space-y-2">
          {beats.map((beat, index) => (
            <motion.div
              key={beat.id}
              initial={staticFallback ? false : { opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: staticFallback ? 0 : index * 0.1 }}
              className="rounded-lg border border-border-subtle bg-surface-elevated p-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-text-primary">{beat.word}</span>
                <span className="font-mono text-[10px] text-text-tertiary">{beat.time.toFixed(1)}s</span>
              </div>
              <div className="mt-2 flex items-center gap-2">
                <span className={cn("rounded px-1.5 py-0.5 text-[10px] uppercase", beatTypeClass(beat.type))}>
                  {beat.type}
                </span>
                <div className="h-1 flex-1 overflow-hidden rounded-full bg-surface-floating">
                  <motion.div
                    initial={staticFallback ? false : { width: 0 }}
                    animate={{ width: `${beat.intensity * 100}%` }}
                    transition={{ duration: staticFallback ? 0 : 0.5, delay: staticFallback ? 0 : index * 0.1 }}
                    className={cn("h-full rounded-full", beat.intensity > 0.8 ? "bg-accent-gold" : "bg-accent-cyan")}
                  />
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
      <div className="border-t border-border-subtle p-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPlaying(true)}
            className="glass-button flex h-8 w-8 items-center justify-center rounded-lg"
            aria-label="Play beat preview"
          >
            <Play className="h-3.5 w-3.5 text-text-secondary" />
          </button>
          <button
            onClick={() => setPlaying(false)}
            className="glass-button flex h-8 w-8 items-center justify-center rounded-lg"
            aria-label="Pause beat preview"
          >
            <Pause className="h-3.5 w-3.5 text-text-secondary" />
          </button>
          <span className="ml-auto text-xs text-text-tertiary">{beats.length} beats</span>
        </div>
      </div>
    </div>
  );
}

function beatTypeClass(type: Beat["type"]) {
  if (type === "climax") {
    return "bg-accent-gold/20 text-accent-gold";
  }

  if (type === "emphasis") {
    return "bg-accent-cyan/20 text-accent-cyan";
  }

  return "bg-surface-floating text-text-tertiary";
}
