"use client";

import { Check, ChevronDown, Loader2 } from "lucide-react";
import { useState } from "react";

import { cn } from "@/lib/utils";

type ThinkingMode = "collapsible" | "streaming";

interface ThinkingStep {
  text: string;
  completed?: boolean;
}

const defaultSteps: ThinkingStep[] = [
  { text: "Analyzing request..." },
  { text: "Retrieving context..." },
  { text: "Checking tool requirements..." },
  { text: "Generating response..." },
];

export function PrometheusChatThinkingProcess({
  active,
  steps = defaultSteps,
  mode = "collapsible",
  toolStatus,
}: {
  active: boolean;
  steps?: ThinkingStep[];
  mode?: ThinkingMode;
  toolStatus?: Array<{ name: string; status: "pending" | "executing" | "complete" }>;
}) {
  const [open, setOpen] = useState(mode === "streaming"); // Streaming mode starts open
  const currentStep = steps.findIndex((s) => !s.completed);
  const stepsToShow = steps.length > 0 ? steps : defaultSteps;

  return (
    <div className={cn("mb-2 text-xs text-white/40", mode === "streaming" && "border-l border-white/20 pl-3")}>
      {mode === "collapsible" ? (
        <>
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            className="inline-flex items-center gap-1.5 hover:text-white/65 transition-colors"
            aria-expanded={open}
          >
            <ChevronDown
              className={cn("size-3 transition-transform", !open && "-rotate-90")}
            />
            Thinking process
          </button>
          {open && (
            <div className="mt-2 space-y-1 pl-1">
              <ul aria-label="Thinking process" className="space-y-1">
                {stepsToShow.map((step, index) => (
                  <li key={`${step.text}-${index}`} className="flex items-center gap-1.5">
                    {step.completed ? (
                      <Check className="size-3 text-white/55" />
                    ) : active && index === currentStep ? (
                      <Loader2 className="size-3 text-white/55 animate-spin" />
                    ) : (
                      <Check className="size-3 text-white/25" />
                    )}
                    <span className={cn(step.completed && "text-white/30", active && index === currentStep && "text-white/60")}>
                      {step.text}
                    </span>
                  </li>
                ))}
              </ul>
              {toolStatus && toolStatus.length > 0 && (
                <div className="mt-2 pt-1 border-t border-white/10">
                  <div className="text-white/30 mb-1 text-xs">Tool calls:</div>
                  {toolStatus.map((tool) => (
                    <div key={tool.name} className="flex items-center gap-1.5 ml-3">
                      {tool.status === "complete" ? (
                        <Check className="size-2.5 text-green-500/70" />
                      ) : tool.status === "executing" ? (
                        <Loader2 className="size-2.5 text-blue-400/70 animate-spin" />
                      ) : (
                        <div className="size-2.5 rounded-full border border-white/20" />
                      )}
                      <span className="text-white/40 text-xs">{tool.name}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      ) : (
        // Streaming mode: Live real-time display
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-white/50">
            <Loader2 className="size-3 animate-spin" />
            <span className="font-medium">Thinking</span>
          </div>
          <ul aria-label="Thinking process - streaming" className="space-y-0.5 pl-4">
            {stepsToShow.map((step, index) => (
              <li
                key={`${step.text}-${index}`}
                className={cn(
                  "flex items-center gap-1.5 transition-opacity",
                  step.completed ? "opacity-40" : "opacity-100"
                )}
              >
                {step.completed ? (
                  <Check className="size-2.5 text-white/55" />
                ) : active && index === currentStep ? (
                  <Loader2 className="size-2.5 text-white/60 animate-spin" />
                ) : (
                  <div className="size-2.5 rounded-full border border-white/30" />
                )}
                <span className="text-white/70 text-xs">{step.text}</span>
              </li>
            ))}
          </ul>
          {toolStatus && toolStatus.length > 0 && (
            <div className="mt-2 pl-4 space-y-0.5 border-t border-white/10 pt-1">
              {toolStatus.map((tool) => (
                <div key={tool.name} className="flex items-center gap-1.5">
                  {tool.status === "complete" ? (
                    <Check className="size-2.5 text-green-500/70" />
                  ) : tool.status === "executing" ? (
                    <Loader2 className="size-2.5 text-blue-400/70 animate-spin" />
                  ) : (
                    <div className="size-2.5 rounded-full border border-white/20" />
                  )}
                  <span className="text-white/50 text-xs">{tool.name}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
