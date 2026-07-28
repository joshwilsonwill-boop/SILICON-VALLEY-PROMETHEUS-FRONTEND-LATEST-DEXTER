"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState } from "react";

import { splitChatSessionTitle } from "@/lib/prometheus-assistant/chat-history";
import type { ChatSession } from "@/lib/supabase/chat-sessions";
import { cn } from "@/lib/utils";

import { PrometheusChatSessionMenu } from "./prometheus-chat-session-menu";

export function PrometheusChatHistoryRow({
  active,
  disabled,
  index,
  onDelete,
  onRename,
  onSelect,
  session,
}: {
  active: boolean;
  disabled?: boolean;
  index: number;
  onDelete: (session: ChatSession) => void;
  onRename: (sessionId: string, title: string) => void;
  onSelect: (session: ChatSession) => void;
  session: ChatSession;
}) {
  const reduceMotion = useReducedMotion();
  const [editing, setEditing] = useState(false);
  const [draftTitle, setDraftTitle] = useState(session.title);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const titleWords = splitChatSessionTitle(session.title);

  useEffect(() => {
    if (editing) inputRef.current?.select();
  }, [editing]);

  const submitRename = () => {
    const title = draftTitle.trim();
    setEditing(false);
    if (title && title !== session.title) onRename(session.id, title);
  };

  return (
    <motion.div
      className={cn(
        "group flex items-center gap-2 rounded-xl border border-transparent bg-white/[0.025] p-3 transition-colors hover:border-white/[0.08] hover:bg-white/[0.055]",
        active && "border-white/[0.14] bg-white/[0.065]",
      )}
      data-active={active}
      initial={reduceMotion ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: reduceMotion ? 0 : 0.18,
        delay: reduceMotion ? 0 : Math.min(index * 0.045, 0.32),
        ease: [0.16, 1, 0.3, 1],
      }}
    >
      {active ? (
        <span
          className="h-8 w-px shrink-0 rounded-full bg-white/60"
          aria-hidden="true"
        />
      ) : null}

      {editing ? (
        <form
          className="min-w-0 flex-1"
          onSubmit={(event) => {
            event.preventDefault();
            submitRename();
          }}
        >
          <input
            ref={inputRef}
            value={draftTitle}
            disabled={disabled}
            onChange={(event) => setDraftTitle(event.target.value)}
            onBlur={submitRename}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                setDraftTitle(session.title);
                setEditing(false);
              }
            }}
            aria-label="Rename chat"
            className="h-8 w-full rounded-lg border border-white/15 bg-black/40 px-2 text-sm text-white outline-none focus:border-white/35"
          />
        </form>
      ) : (
        <button
          type="button"
          disabled={disabled}
          onClick={() => onSelect(session)}
          className="min-w-0 flex-1 text-left disabled:cursor-wait"
        >
          <span className="sr-only">{session.title}</span>
          <span
            className="block truncate text-sm font-medium text-white"
            aria-hidden="true"
          >
            {titleWords.map((word, wordIndex) => (
              <motion.span
                key={`${word}-${wordIndex}`}
                className="inline-block"
                initial={reduceMotion ? false : { opacity: 0, y: "0.4em" }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: reduceMotion ? 0 : 0.2,
                  delay: reduceMotion
                    ? 0
                    : Math.min(index * 0.045 + wordIndex * 0.022, 0.42),
                  ease: [0.16, 1, 0.3, 1],
                }}
              >
                {word}
                {wordIndex < titleWords.length - 1 ? "\u00a0" : ""}
              </motion.span>
            ))}
          </span>
          <span className="mt-1 block text-xs text-white/38">
            {formatSessionTimestamp(session.updated_at)}
          </span>
        </button>
      )}

      {!editing ? (
        <PrometheusChatSessionMenu
          onRename={() => {
            setDraftTitle(session.title);
            setEditing(true);
          }}
          onDelete={() => onDelete(session)}
        />
      ) : null}
    </motion.div>
  );
}

function formatSessionTimestamp(value: string) {
  const timestamp = new Date(value);
  const now = new Date();
  if (timestamp.toDateString() === now.toDateString()) {
    return new Intl.DateTimeFormat(undefined, {
      hour: "numeric",
      minute: "2-digit",
    }).format(timestamp);
  }
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
  }).format(timestamp);
}
