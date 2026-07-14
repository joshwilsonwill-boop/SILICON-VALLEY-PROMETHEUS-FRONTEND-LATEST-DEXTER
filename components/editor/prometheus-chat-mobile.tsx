"use client";

import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function PrometheusChatMobile({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <section className={cn("fixed inset-x-0 bottom-0 max-h-[82dvh] overflow-hidden rounded-t-2xl border-t border-white/10 bg-[#101012]/95 shadow-[0_-24px_80px_rgba(0,0,0,0.55)] backdrop-blur-2xl", className)}>
      <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-white/20" aria-hidden="true" />
      {children}
    </section>
  );
}
