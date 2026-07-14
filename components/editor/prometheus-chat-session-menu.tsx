"use client";

import { MoreVertical, Pencil, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export function PrometheusChatSessionMenu({
  onDelete,
  onRename,
}: {
  onDelete: () => void;
  onRename: () => void;
}) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setOpen(false);
    };
    window.addEventListener("mousedown", close);
    return () => window.removeEventListener("mousedown", close);
  }, [open]);

  return (
    <div ref={menuRef} className="relative shrink-0">
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          setOpen((value) => !value);
        }}
        className="grid size-7 place-items-center rounded-md text-white/40 opacity-100 hover:bg-white/[0.06] hover:text-white md:opacity-0 md:group-hover:opacity-100"
        aria-label="Chat session actions"
      >
        <MoreVertical className="size-4" />
      </button>
      {open ? (
        <div className="absolute right-0 top-8 z-30 w-28 rounded-lg border border-white/10 bg-[#171719] p-1 shadow-xl">
          <button type="button" onClick={() => { onRename(); setOpen(false); }} className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs text-white/75 hover:bg-white/[0.06]">
            <Pencil className="size-3" /> Rename
          </button>
          <button type="button" onClick={() => { onDelete(); setOpen(false); }} className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs text-red-300 hover:bg-red-400/10">
            <Trash2 className="size-3" /> Delete
          </button>
        </div>
      ) : null}
    </div>
  );
}
