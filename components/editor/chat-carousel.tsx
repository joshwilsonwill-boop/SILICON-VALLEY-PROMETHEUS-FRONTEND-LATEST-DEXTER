"use client";

import {
  Clapperboard,
  Image as ImageIcon,
  LayoutTemplate,
  Music2,
  Sparkles,
  Type,
  type LucideIcon,
} from "lucide-react";
import { useRef, useState, type KeyboardEvent } from "react";

import type { CarouselItem, CarouselItemKind } from "@/hooks/use-ai-chat";
import { cn } from "@/lib/utils";

const kindIcons: Record<CarouselItemKind, LucideIcon> = {
  action: Sparkles,
  style: Clapperboard,
  asset: ImageIcon,
  music: Music2,
  font: Type,
  template: LayoutTemplate,
};

export function ChatCarousel({
  items,
  disabled = false,
  onSelect,
  className,
}: {
  items: CarouselItem[];
  disabled?: boolean;
  onSelect: (item: CarouselItem) => void;
  className?: string;
}) {
  const buttonRefs = useRef<Array<HTMLButtonElement | null>>([]);
  if (items.length < 3) return null;
  const visibleItems = items.slice(0, 8);

  const moveFocus = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    const offset = event.key === "ArrowRight" ? 1 : -1;
    const nextIndex = (index + offset + visibleItems.length) % visibleItems.length;
    buttonRefs.current[nextIndex]?.focus();
  };

  return (
    <ul
      aria-label="Recommended options"
      className={cn(
        "flex max-w-full snap-x snap-mandatory gap-2 overflow-x-auto overscroll-x-contain pb-2",
        "[scrollbar-color:rgba(255,255,255,0.16)_transparent] [scrollbar-width:thin]",
        className,
      )}
    >
      {visibleItems.map((item, index) => (
        <li key={item.id} className="w-[min(17rem,78vw)] shrink-0 snap-start sm:w-64">
          <CarouselOption
            ref={(node) => {
              buttonRefs.current[index] = node;
            }}
            item={item}
            disabled={disabled || !item.payload?.message}
            onClick={() => onSelect(item)}
            onKeyDown={(event) => moveFocus(event, index)}
          />
        </li>
      ))}
    </ul>
  );
}

function CarouselOption({
  ref,
  item,
  disabled,
  onClick,
  onKeyDown,
}: {
  ref: (node: HTMLButtonElement | null) => void;
  item: CarouselItem;
  disabled: boolean;
  onClick: () => void;
  onKeyDown: (event: KeyboardEvent<HTMLButtonElement>) => void;
}) {
  const [imageFailed, setImageFailed] = useState(false);
  const Icon = kindIcons[item.kind];

  return (
    <button
      ref={ref}
      type="button"
      disabled={disabled}
      onClick={onClick}
      onKeyDown={onKeyDown}
      className={cn(
        "group flex min-h-11 w-full flex-col overflow-hidden rounded-lg border border-white/10 bg-white/[0.025] text-left",
        "transition-[background-color,border-color,color,transform] duration-[var(--dur-hover)] ease-[var(--ease-hover)]",
        "hover:border-white/20 hover:bg-white/[0.055] active:scale-[0.985] active:duration-[var(--dur-press)]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/35",
        "disabled:pointer-events-none disabled:opacity-45",
      )}
      aria-label={item.subtitle ? `${item.title}. ${item.subtitle}` : item.title}
    >
      <span className="relative flex aspect-[16/7] w-full items-center justify-center overflow-hidden border-b border-white/[0.07] bg-white/[0.025]">
        {item.image && !imageFailed ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.image}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-[var(--dur-content)] ease-[var(--ease-structural)] group-hover:scale-[1.02]"
            onError={() => setImageFailed(true)}
          />
        ) : (
          <Icon className="size-6 text-white/32" strokeWidth={1.35} aria-hidden="true" />
        )}
        {item.badge ? (
          <span className="absolute left-2 top-2 rounded-full border border-white/12 bg-black/80 px-2 py-1 text-[10px] font-medium uppercase tracking-[0.08em] text-white/70">
            {item.badge}
          </span>
        ) : null}
      </span>
      <span className="flex min-h-[4.75rem] w-full flex-col justify-center px-3 py-2.5">
        <span className="text-[13px] font-medium leading-5 text-white/90">{item.title}</span>
        {item.subtitle ? (
          <span className="mt-0.5 line-clamp-2 text-[11px] leading-4 text-white/46">{item.subtitle}</span>
        ) : null}
      </span>
    </button>
  );
}
