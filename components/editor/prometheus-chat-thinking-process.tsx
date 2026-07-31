"use client";

import { Check, ChevronDown } from "lucide-react";
import { useState } from "react";

import { cn } from "@/lib/utils";

const steps = ["Analyzing request...", "Retrieving context...", "Generating response..."];

export function PrometheusChatThinkingProcess({ active }: { active: boolean }) {
  const [open, setOpen] = useState(true);

  return (
    <div className="mb-2 font-elegist text-xs text-white/40">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="inline-flex items-center gap-1.5 hover:text-white/65"
        aria-expanded={open}
      >
        <ChevronDown className={cn("size-3 transition-transform", !open && "-rotate-90")} />
        Thinking process
      </button>
      {open ? (
        <ul className="mt-2 space-y-1 pl-1" aria-label="Thinking process">
          {steps.map((step, index) => (
            <li key={step} className="flex items-center gap-1.5">
              <Check className={cn("size-3", active && index === steps.length - 1 ? "animate-pulse text-white/55" : "text-white/35")} />
              {step}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
