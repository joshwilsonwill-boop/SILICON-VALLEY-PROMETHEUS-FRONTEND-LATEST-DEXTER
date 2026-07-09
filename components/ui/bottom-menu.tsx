"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

export interface MenuBarItem {
  icon: (props: React.SVGProps<SVGSVGElement>) => React.ReactElement;
  label: string;
  value: string | number; // Used for logic matching
  onClick?: () => void;
}

interface MenuBarProps extends React.HTMLAttributes<HTMLDivElement> {
  items: MenuBarItem[];
  activeValue?: string | number; // To highlight the currently active tab
  onItemClick?: (value: string | number) => void;
}

const springConfig = {
  duration: 0.3,
  ease: "easeInOut",
};

export function MenuBar({
  items,
  className,
  activeValue,
  onItemClick,
  ...props
}: MenuBarProps) {
  const [hoveredIndex, setHoveredIndex] = React.useState<number | null>(null);
  const menuRef = React.useRef<HTMLDivElement>(null);
  const [tooltipPosition, setTooltipPosition] = React.useState({
    left: 0,
    width: 0,
  });
  const tooltipRef = React.useRef<HTMLDivElement>(null);

  // Determine active index for tooltip
  const activeIndex = hoveredIndex !== null ? hoveredIndex : (activeValue ? items.findIndex(i => i.value === activeValue) : null);

  React.useEffect(() => {
    if (activeIndex !== null && menuRef.current && tooltipRef.current) {
      const menuItem = menuRef.current.children[activeIndex] as HTMLElement;
      const menuRect = menuRef.current.getBoundingClientRect();
      const itemRect = menuItem.getBoundingClientRect();
      const tooltipRect = tooltipRef.current.getBoundingClientRect();

      const left =
        itemRect.left -
        menuRect.left +
        (itemRect.width - tooltipRect.width) / 2;

      setTooltipPosition({
        left: Math.max(0, Math.min(left, menuRect.width - tooltipRect.width)),
        width: tooltipRect.width,
      });
    }
  }, [activeIndex]);

  return (
    <div className={cn("relative w-full flex justify-center", className)} {...props}>
      <AnimatePresence>
        {activeIndex !== null && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 5 }}
            transition={springConfig}
            className="absolute left-0 right-0 -top-[31px] pointer-events-none z-50 flex justify-center"
          >
            <motion.div
              ref={tooltipRef}
              className={cn(
                "h-7 px-3 rounded-lg inline-flex justify-center items-center overflow-hidden",
                "bg-background/95 backdrop-blur",
                "border border-border/50",
                "shadow-[0_0_0_1px_rgba(0,0,0,0.08)]",
                "dark:border-border/50 dark:shadow-[0_0_0_1px_rgba(255,255,255,0.08)]"
              )}
              initial={{ x: tooltipPosition.left }}
              animate={{ x: tooltipPosition.left }}
              transition={springConfig}
              style={{ width: "auto" }}
            >
              <p className="text-[13px] font-medium leading-tight whitespace-nowrap">
                {items[activeIndex].label}
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div
        ref={menuRef}
        className={cn(
          "h-10 px-1.5 inline-flex justify-center items-center gap-[3px] overflow-hidden z-10",
          "rounded-full bg-background/95 backdrop-blur",
          "border border-border/50",
          "shadow-[0_0_0_1px_rgba(0,0,0,0.08),0_8px_16px_-4px_rgba(0,0,0,0.1)]",
          "dark:border-border/50 dark:shadow-[0_0_0_1px_rgba(255,255,255,0.08),0_8px_16px_-4px_rgba(0,0,0,0.2)]"
        )}
      >
        {items.map((item, index) => (
          <button
            key={index}
            className={cn(
              "w-8 h-8 px-3 py-1 rounded-full flex justify-center items-center gap-2 transition-colors",
              activeValue === item.value && "bg-muted/30"
            )}
            onMouseEnter={() => setHoveredIndex(index)}
            onMouseLeave={() => setHoveredIndex(null)}
            onClick={() => {
              if (onItemClick) onItemClick(item.value);
              if (item.onClick) item.onClick();
            }}
          >
            <div className="flex justify-center items-center">
              <div className="w-[18px] h-[18px] flex justify-center items-center overflow-hidden">
                <item.icon className="w-full h-full" />
              </div>
            </div>
            <span className="sr-only">{item.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
