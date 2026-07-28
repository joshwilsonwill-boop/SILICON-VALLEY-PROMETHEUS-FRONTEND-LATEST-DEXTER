"use client";

import type { Ref } from "react";

export function AIChatHistoryButton({
  buttonRef,
  onClick,
  open = false,
  unreadCount = 0,
}: {
  buttonRef?: Ref<HTMLButtonElement>;
  onClick: () => void;
  open?: boolean;
  unreadCount?: number;
}) {
  return (
    <button
      ref={buttonRef}
      type="button"
      onClick={onClick}
      className="group relative grid size-12 place-items-center rounded-full text-white/75 transition-colors hover:bg-white/[0.05] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
      aria-label={open ? "Close chat history" : "Open chat history"}
      aria-expanded={open}
    >
      <span className="relative block h-7 w-11" aria-hidden="true">
        <span
          className={`absolute right-0 h-px bg-current transition-[top,width,transform] duration-200 ease-out ${
            open
              ? "top-1/2 w-8 -translate-y-1/2 rotate-45"
              : "top-[7px] w-11 group-hover:w-10"
          }`}
        />
        <span
          className={`absolute right-0 h-px bg-current transition-[top,width,transform] duration-200 ease-out ${
            open
              ? "top-1/2 w-8 -translate-y-1/2 -rotate-45"
              : "top-[19px] w-[34px] group-hover:w-10"
          }`}
        />
      </span>
      {unreadCount > 0 ? <span className="absolute right-1.5 top-1.5 size-2 rounded-full bg-red-400" aria-hidden="true" /> : null}
    </button>
  );
}
