"use client";

import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowLeft,
  BarChart3,
  Clock,
  Folder,
  Plus,
  Settings,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import { useDeviceTier } from "@/hooks/useDeviceTier";

const navItems = [
  {
    id: "projects",
    label: "Projects",
    icon: Folder,
    count: 3,
    href: "/projects",
  },
  {
    id: "recent",
    label: "Recent",
    icon: Clock,
    count: 0,
    href: "/projects?view=recent",
  },
  {
    id: "motion",
    label: "Motion Brain",
    icon: Zap,
    count: 0,
    href: "/editor/motion",
  },
  {
    id: "analytics",
    label: "Analytics",
    icon: BarChart3,
    count: 0,
    href: "/analytics",
  },
];

export function AwwwardsSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const shouldReduceMotion = useReducedMotion();
  const tier = useDeviceTier();
  const animated = !shouldReduceMotion && tier !== "low";
  const spring = animated
    ? { type: "spring" as const, damping: 30, stiffness: 300 }
    : { duration: 0 };

  return (
    <motion.aside
      initial={false}
      animate={{ width: 256 }}
      transition={spring}
      className="glass-panel relative flex h-full flex-col border-r border-border-subtle"
      aria-label="Premium editor navigation"
    >
      <nav
        className="flex-1 overflow-y-auto overflow-x-visible p-2 pt-3"
        aria-label="Editor sections"
      >
        <button
          type="button"
          onClick={() => router.back()}
          className="group relative mb-1 flex min-h-11 w-full items-center rounded-xl border border-transparent px-3 py-2.5 text-sm text-text-secondary transition-all hover:bg-white/5 hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-cyan"
          aria-label="Go back"
        >
          <ArrowLeft className="h-[18px] w-[18px] flex-shrink-0" />
          <motion.span
            initial={animated ? { opacity: 0, x: -8 } : false}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: animated ? 0.15 : 0 }}
            className="ml-3"
          >
            Back
          </motion.span>
        </button>

        <Link
          href="/editor/__new__"
          className="group relative mb-2 flex min-h-11 w-full items-center rounded-xl border border-white/8 bg-white/[0.035] px-3 py-2.5 text-sm text-text-primary transition-all hover:border-white/14 hover:bg-white/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-cyan"
          aria-label="Create project"
        >
          <Plus className="h-[18px] w-[18px] flex-shrink-0" />
          <motion.span
            initial={animated ? { opacity: 0, x: -8 } : false}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: animated ? 0.15 : 0 }}
            className="ml-3"
          >
            New project
          </motion.span>
        </Link>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = isNavItemActive(pathname, item.href);

          return (
            <Link
              key={item.id}
              href={item.href}
              className={`group relative flex min-h-11 w-full items-center rounded-xl border px-3 py-2.5 text-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-cyan ${
                isActive
                  ? "border-accent-cyan/20 bg-accent-cyan-glow text-accent-cyan"
                  : "border-transparent text-text-secondary hover:bg-white/5 hover:text-text-primary"
              }`}
              aria-current={isActive ? "page" : undefined}
            >
              <Icon className="h-[18px] w-[18px] flex-shrink-0" />
              <motion.span
                initial={animated ? { opacity: 0, x: -8 } : false}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: animated ? 0.15 : 0 }}
                className="ml-3"
              >
                {item.label}
              </motion.span>

              {item.count > 0 && (
                <motion.span
                  initial={animated ? { scale: 0 } : false}
                  animate={{ scale: 1 }}
                  className="ml-auto rounded-full bg-surface-floating px-2 py-0.5 text-[10px] text-text-tertiary"
                >
                  {item.count}
                </motion.span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-border-subtle p-4">
        <div className="glass-button rounded-lg p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs text-text-tertiary">Storage</span>
            <span className="text-xs text-text-secondary">60%</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-floating">
            <motion.div
              initial={animated ? { width: 0 } : false}
              animate={{ width: "60%" }}
              transition={{ duration: animated ? 1 : 0, ease: "easeOut" }}
              className="h-full rounded-full bg-gradient-to-r from-accent-cyan to-accent-cyan-dim"
            />
          </div>
        </div>
      </div>

      <div className="border-t border-border-subtle p-2">
        <button
          type="button"
          className="flex min-h-11 w-full items-center rounded-xl px-3 py-2.5 text-sm text-text-secondary transition-colors hover:bg-white/5 hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-cyan"
        >
          <Settings className="h-[18px] w-[18px]" />
          <motion.span
            initial={animated ? { opacity: 0, x: -8 } : false}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: animated ? 0.15 : 0 }}
            className="ml-3"
          >
            Settings
          </motion.span>
        </button>
      </div>
    </motion.aside>
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
