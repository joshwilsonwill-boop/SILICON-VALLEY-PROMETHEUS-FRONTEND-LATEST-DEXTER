"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  Activity,
  ArrowLeft,
  BarChart3,
  Clock3,
  Folder,
  GitBranch,
  MessageSquare,
  Music,
  Plus,
  Settings,
  Upload,
  X,
  Zap,
  type LucideIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";

export type EditorSidebarPanelKey =
  | "motion"
  | "music"
  | "analytics"
  | "timeline"
  | "chat"
  | "versions"
  | "status"
  | "export";

type SidebarItem =
  | {
      action: "navigate";
      href: string;
      icon: LucideIcon;
      id: "projects" | "motion";
      label: string;
    }
  | {
      action: "panel";
      icon: LucideIcon;
      id: EditorSidebarPanelKey;
      label: string;
      panel: EditorSidebarPanelKey;
    }
  | {
      action: "settings";
      icon: LucideIcon;
      id: "settings";
      label: string;
    };

const sidebarItems: SidebarItem[] = [
  {
    id: "projects",
    label: "Projects",
    icon: Folder,
    href: "/projects",
    action: "navigate",
  },
  {
    id: "motion",
    label: "Motion Brain",
    icon: Zap,
    href: "/editor/motion",
    action: "navigate",
  },
  { id: "music", label: "Music", icon: Music, action: "panel", panel: "music" },
  {
    id: "analytics",
    label: "Analytics",
    icon: BarChart3,
    action: "panel",
    panel: "analytics",
  },
  {
    id: "timeline",
    label: "Timeline",
    icon: Clock3,
    action: "panel",
    panel: "timeline",
  },
  {
    id: "chat",
    label: "Chat",
    icon: MessageSquare,
    action: "panel",
    panel: "chat",
  },
  {
    id: "versions",
    label: "Versions",
    icon: GitBranch,
    action: "panel",
    panel: "versions",
  },
  {
    id: "status",
    label: "Status",
    icon: Activity,
    action: "panel",
    panel: "status",
  },
  {
    id: "export",
    label: "Export",
    icon: Upload,
    action: "panel",
    panel: "export",
  },
  { id: "settings", label: "Settings", icon: Settings, action: "settings" },
];

export function EditorHamburgerSidebar({
  activePanel,
  isOpen,
  onClose,
  onOpenPanel,
  onOpenSettings,
}: {
  activePanel: EditorSidebarPanelKey | null;
  isOpen: boolean;
  onClose: () => void;
  onOpenPanel: (panel: EditorSidebarPanelKey) => void;
  onOpenSettings: () => void;
}) {
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      onClose();
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  return (
    <>
      <button
        type="button"
        aria-hidden="true"
        tabIndex={-1}
        className={cn(
          "fixed inset-0 z-40 bg-black/75 backdrop-blur-2xl transition-opacity duration-300 md:hidden",
          isOpen
            ? "pointer-events-auto opacity-100"
            : "pointer-events-none opacity-0",
        )}
        onClick={onClose}
      />

      <aside
        id="prometheus-editor-hamburger-sidebar"
        aria-label="Prometheus editor navigation"
        aria-modal="true"
        role="dialog"
        className={cn(
          "glass-panel-enhanced fixed inset-y-0 left-0 z-50 flex w-[min(320px,86vw)] flex-col overflow-hidden rounded-none border-y-0 border-l-0 border-r border-white/10 pt-[env(safe-area-inset-top)] text-prometheus-text-primary shadow-[28px_0_90px_-38px_rgba(0,0,0,0.95)] transition-transform duration-300 ease-out md:hidden",
          isOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <header className="flex items-center justify-between border-b border-white/10 px-4 py-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-white/72">
              Prometheus
            </p>
            <p className="mt-1 text-xs text-white/38">Editor navigation</p>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            className="grid size-10 place-items-center rounded-full border border-white/10 bg-white/[0.04] text-white/70 transition-colors hover:bg-white/[0.08] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-prometheus-accent-cyan/70"
            aria-label="Close editor menu"
          >
            <X className="size-5" aria-hidden="true" />
          </button>
        </header>

        <nav
          className="min-h-0 flex-1 space-y-1 overflow-y-auto px-3 py-4 scrollbar-hidden"
          aria-label="Editor tools"
        >
          <button
            type="button"
            onClick={() => {
              onClose();
              router.back();
            }}
            className="group flex min-h-12 w-full items-center gap-3 rounded-xl border border-transparent px-4 py-3 text-left text-sm font-medium text-white/62 outline-none transition-all hover:border-white/8 hover:bg-white/[0.045] hover:text-white focus-visible:ring-2 focus-visible:ring-prometheus-accent-cyan/70"
            aria-label="Go back"
          >
            <span className="grid size-8 shrink-0 place-items-center rounded-full border border-white/10 bg-white/[0.04] text-white/70 transition-colors group-hover:text-white">
              <ArrowLeft className="size-[17px]" aria-hidden="true" />
            </span>
            <span className="min-w-0 flex-1 truncate">Back</span>
          </button>

          <button
            type="button"
            onClick={() => {
              onClose();
              router.push("/editor/__new__");
            }}
            className="group flex min-h-12 w-full items-center gap-3 rounded-xl border border-white/10 bg-white/[0.055] px-4 py-3 text-left text-sm font-medium text-white outline-none transition-all hover:border-white/16 hover:bg-white/[0.085] focus-visible:ring-2 focus-visible:ring-prometheus-accent-cyan/70"
            aria-label="Create project"
          >
            <span className="grid size-8 shrink-0 place-items-center rounded-full border border-white/10 bg-white/[0.04] text-white/80 transition-colors group-hover:text-white">
              <Plus className="size-[17px]" aria-hidden="true" />
            </span>
            <span className="min-w-0 flex-1 truncate">New project</span>
          </button>
          {sidebarItems.map((item) => {
            const Icon = item.icon;
            const active =
              item.action === "panel"
                ? activePanel === item.panel
                : pathname === ("href" in item ? item.href : "");

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  onClose();
                  if (item.action === "navigate") {
                    router.push(item.href);
                    return;
                  }
                  if (item.action === "settings") {
                    onOpenSettings();
                    return;
                  }
                  onOpenPanel(item.panel);
                }}
                className={cn(
                  "group flex min-h-12 w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-medium outline-none transition-all focus-visible:ring-2 focus-visible:ring-prometheus-accent-cyan/70",
                  active
                    ? "border border-white/10 bg-white/[0.09] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
                    : "border border-transparent text-white/62 hover:border-white/8 hover:bg-white/[0.045] hover:text-white",
                )}
              >
                <span className="grid size-8 shrink-0 place-items-center rounded-full border border-white/10 bg-white/[0.04] text-white/70 transition-colors group-hover:text-white">
                  <Icon className="size-[17px]" aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1 truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
