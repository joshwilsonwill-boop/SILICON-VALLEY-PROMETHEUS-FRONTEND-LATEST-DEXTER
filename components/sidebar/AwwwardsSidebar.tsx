"use client";

import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowLeft,
  Brain,
  Clapperboard,
  Database,
  History,
  LineChart,
  Plus,
  Settings,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, type FocusEvent } from "react";

import { useDeviceTier } from "@/hooks/useDeviceTier";
import { cn } from "@/lib/utils";

// Keep the collapsed footprint in sync with the Tailwind `w-[72px]` on the aside below.
const RAIL_COLLAPSED_WIDTH = 72;
const RAIL_EXPANDED_WIDTH = 216;

const navItems = [
  {
    id: "projects",
    label: "Projects",
    icon: Clapperboard,
    href: "/projects",
  },
  {
    id: "recent",
    label: "Recent",
    icon: History,
    href: "/projects?view=recent",
  },
  {
    id: "motion",
    label: "Motion Brain",
    icon: Brain,
    href: "/editor/motion",
  },
  {
    id: "analytics",
    label: "Analytics",
    icon: LineChart,
    href: "/analytics",
  },
];

const iconTile =
  "grid size-9 shrink-0 place-items-center rounded-[10px] border transition-all duration-200 motion-reduce:transition-none";

const rowBase =
  "group relative flex h-11 w-full items-center rounded-xl text-sm outline-none transition-colors duration-200 motion-reduce:transition-none focus-visible:ring-2 focus-visible:ring-accent-cyan";

function RailLabel({
  expanded,
  animated,
  delay = 0,
  children,
}: {
  expanded: boolean;
  animated: boolean;
  delay?: number;
  children: string;
}) {
  return (
    <motion.span
      initial={false}
      animate={{ opacity: expanded ? 1 : 0, x: expanded ? 0 : -6 }}
      transition={
        animated ? { duration: 0.18, delay: expanded ? delay : 0 } : { duration: 0 }
      }
      className="ml-3 whitespace-nowrap"
    >
      {children}
    </motion.span>
  );
}

export function AwwwardsSidebar({
  onOpenSettings,
  onExpandedChange,
}: {
  onOpenSettings?: () => void;
  onExpandedChange?: (expanded: boolean) => void;
} = {}) {
  const pathname = usePathname();
  const router = useRouter();
  const shouldReduceMotion = useReducedMotion();
  const tier = useDeviceTier();
  const animated = !shouldReduceMotion && tier !== "low";
  const spring = animated
    ? { type: "spring" as const, damping: 30, stiffness: 300 }
    : { duration: 0 };
  const [expanded, setExpanded] = useState(false);

  const updateExpanded = (next: boolean) => {
    setExpanded(next);
    onExpandedChange?.(next);
  };

  const collapseIfFocusLeft = (event: FocusEvent<HTMLElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
      updateExpanded(false);
    }
  };

  return (
    <aside
      aria-label="Premium editor navigation"
      className="relative h-full w-[72px] flex-shrink-0"
      data-expanded={expanded ? "true" : "false"}
      onMouseEnter={() => updateExpanded(true)}
      onMouseLeave={() => updateExpanded(false)}
      onFocusCapture={() => updateExpanded(true)}
      onBlurCapture={collapseIfFocusLeft}
    >
      <motion.div
        initial={false}
        animate={{
          width: expanded ? RAIL_EXPANDED_WIDTH : RAIL_COLLAPSED_WIDTH,
        }}
        transition={spring}
        className={cn(
          "glass-panel absolute inset-y-0 left-0 z-30 flex h-full flex-col overflow-hidden border-r border-border-subtle",
          expanded &&
            "bg-chrome-950/95 shadow-[24px_0_64px_-28px_rgba(0,0,0,0.85)] backdrop-blur-xl",
        )}
      >
        <nav
          className="flex-1 space-y-1 overflow-y-auto overflow-x-hidden px-[18px] py-3"
          aria-label="Editor sections"
        >
          <button
            type="button"
            onClick={() => router.back()}
            className={cn(rowBase, "text-text-secondary hover:text-text-primary")}
            aria-label="Go back"
          >
            <span
              className={cn(
                iconTile,
                "border-transparent bg-transparent text-text-secondary transition-transform group-hover:scale-105 group-hover:border-white/10 group-hover:bg-white/[0.04] group-hover:text-text-primary motion-reduce:transform-none",
              )}
            >
              <ArrowLeft className="h-[18px] w-[18px]" strokeWidth={1.75} aria-hidden="true" />
            </span>
            <RailLabel expanded={expanded} animated={animated}>
              Back
            </RailLabel>
          </button>

          <Link
            href="/editor/__new__"
            className={rowBase}
            aria-label="Create project"
          >
            <span
              className={cn(
                iconTile,
                "border-accent-cyan/30 bg-accent-cyan-glow text-accent-cyan shadow-lg shadow-accent-cyan/10 transition-transform group-hover:scale-105 group-hover:border-accent-cyan/50 motion-reduce:transform-none",
              )}
            >
              <Plus className="h-[18px] w-[18px]" strokeWidth={1.75} aria-hidden="true" />
            </span>
            <RailLabel expanded={expanded} animated={animated} delay={0.03}>
              New project
            </RailLabel>
          </Link>

          <div
            className="mx-1 my-2 h-px bg-border-subtle/60"
            aria-hidden="true"
          />

          {navItems.map((item, index) => {
            const Icon = item.icon;
            const isActive = isNavItemActive(pathname, item.href);

            return (
              <Link
                key={item.id}
                href={item.href}
                className={cn(
                  rowBase,
                  isActive
                    ? "text-accent-cyan"
                    : "text-text-secondary hover:text-text-primary",
                )}
                aria-current={isActive ? "page" : undefined}
              >
                {isActive ? (
                  <motion.span
                    layoutId="editor-rail-active"
                    transition={spring}
                    className="absolute -left-[15px] top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-full bg-accent-cyan"
                    aria-hidden="true"
                  />
                ) : null}
                <span
                  className={cn(
                    iconTile,
                    isActive
                      ? "border-accent-cyan/25 bg-accent-cyan-glow text-accent-cyan"
                      : "border-white/8 bg-white/[0.03] text-text-secondary transition-transform group-hover:scale-105 group-hover:border-white/16 group-hover:bg-white/[0.06] group-hover:text-text-primary motion-reduce:transform-none",
                  )}
                >
                  <Icon className="h-[18px] w-[18px]" strokeWidth={1.75} aria-hidden="true" />
                </span>
                <RailLabel
                  expanded={expanded}
                  animated={animated}
                  delay={0.06 + index * 0.03}
                >
                  {item.label}
                </RailLabel>
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-border-subtle px-[18px] py-3">
          <div className="flex h-11 items-center" aria-label="Storage used 60 percent">
            <span
              className={cn(
                iconTile,
                "border-white/8 bg-white/[0.03] text-text-tertiary",
              )}
            >
              <Database className="h-[16px] w-[16px]" strokeWidth={1.75} aria-hidden="true" />
            </span>
            <motion.div
              initial={false}
              animate={{ opacity: expanded ? 1 : 0, x: expanded ? 0 : -6 }}
              transition={animated ? { duration: 0.18, delay: expanded ? 0.15 : 0 } : { duration: 0 }}
              className="ml-3 min-w-0 flex-1 whitespace-nowrap"
            >
              <div className="flex items-baseline justify-between text-[11px]">
                <span className="uppercase tracking-[0.14em] text-text-tertiary">
                  Storage
                </span>
                <span className="text-text-secondary">60%</span>
              </div>
              <div
                role="progressbar"
                aria-valuenow={60}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label="Storage used"
                className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-surface-floating"
              >
                <motion.div
                  initial={animated ? { width: 0 } : false}
                  animate={{ width: "60%" }}
                  transition={{ duration: animated ? 1 : 0, ease: "easeOut" }}
                  className="h-full rounded-full bg-gradient-to-r from-accent-cyan to-accent-cyan-dim"
                />
              </div>
            </motion.div>
          </div>
        </div>

        <div className="border-t border-border-subtle px-[18px] py-2">
          <button
            type="button"
            onClick={onOpenSettings}
            className={cn(rowBase, "text-text-secondary hover:text-text-primary")}
            aria-label="Settings"
          >
            <span
              className={cn(
                iconTile,
                "border-white/8 bg-white/[0.03] text-text-secondary transition-transform duration-300 group-hover:rotate-45 group-hover:border-white/16 group-hover:text-text-primary motion-reduce:transform-none",
              )}
            >
              <Settings className="h-[18px] w-[18px]" strokeWidth={1.75} aria-hidden="true" />
            </span>
            <RailLabel expanded={expanded} animated={animated} delay={0.18}>
              Settings
            </RailLabel>
          </button>
        </div>
      </motion.div>
    </aside>
  );
}

function isNavItemActive(pathname: string | null, href: string) {
  if (!pathname) return false;
  if (href.startsWith("/projects")) return pathname.startsWith("/projects");
  if (href === "/editor/motion") return pathname === "/editor/motion";
  if (href === "/analytics") return pathname.startsWith("/analytics");
  if (href.startsWith("/dashboard")) return pathname.startsWith("/dashboard");
  return pathname === href;
}
