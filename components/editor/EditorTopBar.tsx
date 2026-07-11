"use client";

import type { ReactNode } from "react";
import { Menu, Share2 } from "lucide-react";

export function EditorTopBar({
  mobileNavControl,
  onToggleSidebar,
  sidebarOpen,
}: {
  mobileNavControl?: ReactNode;
  onToggleSidebar: () => void;
  sidebarOpen: boolean;
}) {
  return (
    <header className="glass-panel flex h-14 shrink-0 items-center justify-between rounded-none border-x-0 border-t-0 border-b border-border-subtle px-4">
      <div className="flex min-w-0 items-center gap-3">
        {mobileNavControl ? (
          <div className="md:hidden">{mobileNavControl}</div>
        ) : null}
        <button
          type="button"
          onClick={onToggleSidebar}
          className="hidden h-8 w-8 shrink-0 items-center justify-center bg-transparent text-text-secondary transition-colors hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-cyan md:flex"
          aria-label={sidebarOpen ? "Close sidebar" : "Open sidebar"}
        >
          <Menu className="h-4 w-4 text-text-secondary" />
        </button>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          className="glass-button flex h-8 items-center gap-2 rounded-lg px-3 text-xs text-text-secondary hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-cyan"
          aria-label="Share project"
        >
          <Share2 className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Share</span>
        </button>
      </div>
    </header>
  );
}
