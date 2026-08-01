"use client"

import * as React from "react"
import { motion, useReducedMotion } from "framer-motion"
import { cn } from "@/lib/utils"

export type PersonalStylizationItem = {
  id: string
  label: string
  description: string
}

type PersonalStylizationShowcaseProps = {
  items: PersonalStylizationItem[]
  selectedIds: string[]
  onToggle: (id: string) => void
  className?: string
}

const gridStyle = (hoveredIndex: number | null, total: number) => {
  if (hoveredIndex === null) return `repeat(${total}, minmax(0, 1fr))`

  const restingSize = total > 1 ? 0.62 : 1
  return Array.from({ length: total }, (_, index) => (index === hoveredIndex ? "2.52fr" : `${restingSize}fr`)).join(" ")
}

export function PersonalStylizationShowcase({
  items,
  selectedIds,
  onToggle,
  className,
}: PersonalStylizationShowcaseProps) {
  const reduceMotion = useReducedMotion()
  const [hoveredId, setHoveredId] = React.useState<string | null>(null)
  const hoveredIndex = items.findIndex((item) => item.id === hoveredId)

  return (
    <section className={cn("personal-stylization-showcase", className)} aria-label="Personal stylization">
      <div className="flex items-end justify-between gap-4 border-b border-white/[0.1] px-4 py-3 sm:px-5">
        <div>
          <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-white/42">Personal stylization</p>
          <h2 className="mt-1 text-[19px] leading-none text-white/88 [font-family:var(--font-zt-otez),Georgia,serif] sm:text-[22px]">
            Shape the direction
          </h2>
        </div>
        <p className="hidden max-w-40 text-right text-[10px] leading-4 text-white/38 sm:block">Choose the parts of the edit you want to author.</p>
      </div>

      <div
        className="personal-stylization-grid p-2 sm:p-3"
        style={{ "--personal-style-columns": gridStyle(hoveredIndex === -1 ? null : hoveredIndex, items.length) } as React.CSSProperties}
        onPointerLeave={() => setHoveredId(null)}
      >
        {items.map((item, index) => {
          const selected = selectedIds.includes(item.id)
          const hovered = hoveredId === item.id

          return (
            <motion.button
              key={item.id}
              type="button"
              aria-pressed={selected}
              onClick={() => onToggle(item.id)}
              onFocus={() => setHoveredId(item.id)}
              onPointerMove={() => setHoveredId((current) => (current === item.id ? current : item.id))}
              whileTap={reduceMotion ? undefined : { scale: 0.985 }}
              transition={{ duration: reduceMotion ? 0 : 0.38, ease: [0.22, 1, 0.36, 1] }}
              className={cn(
                "group relative flex min-h-[116px] min-w-0 flex-col justify-between overflow-hidden rounded-[6px] border bg-black p-3 text-left outline-none transition-[background-color,border-color,color] duration-300 focus-visible:border-white/72 focus-visible:ring-2 focus-visible:ring-white/35 sm:min-h-[270px] sm:p-4",
                selected
                  ? "border-white/62 bg-white/[0.045]"
                  : "border-white/[0.12] hover:border-white/42 hover:bg-white/[0.025]",
              )}
            >
              <span className="text-[9px] font-medium uppercase tracking-[0.18em] text-white/40">0{index + 1}</span>
              <span className="relative z-10 block">
                <span
                  className={cn(
                    "block break-words text-[19px] leading-[0.92] text-white/76 transition-colors duration-300 [font-family:var(--font-zt-otez),Georgia,serif] sm:text-[25px]",
                    (hovered || selected) && "text-white",
                  )}
                >
                  {item.label}
                </span>
                <span className="mt-3 block max-w-[18rem] text-[10px] leading-[1.45] text-white/40 transition-colors duration-300 group-hover:text-white/62 sm:text-[11px]">
                  {item.description}
                </span>
              </span>
              <span className={cn("text-[9px] uppercase tracking-[0.16em] transition-colors duration-300", selected ? "text-white/76" : "text-white/28")}>
                {selected ? "Selected" : "Select"}
              </span>
            </motion.button>
          )
        })}
      </div>

      <style>{`
        .personal-stylization-showcase {
          overflow: hidden;
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 8px;
          background: #000;
        }

        .personal-stylization-grid {
          display: grid;
          grid-template-columns: minmax(0, 1fr);
          gap: 6px;
        }

        @media (min-width: 640px) {
          .personal-stylization-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (min-width: 1024px) {
          .personal-stylization-grid {
            grid-template-columns: var(--personal-style-columns);
            transition: grid-template-columns 540ms cubic-bezier(0.22, 1, 0.36, 1);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .personal-stylization-grid {
            transition: none;
          }
        }
      `}</style>
    </section>
  )
}
