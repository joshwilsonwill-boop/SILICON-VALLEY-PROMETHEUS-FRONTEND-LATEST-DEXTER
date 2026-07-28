"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Plus, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { groupChatSessions } from "@/lib/prometheus-assistant/chat-history";
import type { ChatSession } from "@/lib/supabase/chat-sessions";

import { PrometheusChatHistoryRow } from "./prometheus-chat-history-row";

export function PrometheusChatHistoryDrawer({
  currentSessionId,
  isLoading,
  onClose,
  onDeleteSession,
  onNewSession,
  onRenameSession,
  onSelectSession,
  sessions,
}: {
  currentSessionId: string | null;
  isLoading: boolean;
  onClose: () => void;
  onDeleteSession: (sessionId: string) => void;
  onNewSession: () => void;
  onRenameSession: (sessionId: string, title: string) => void;
  onSelectSession: (sessionId: string) => void;
  sessions: ChatSession[];
}) {
  const reduceMotion = useReducedMotion();
  const asideRef = useRef<HTMLElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const [pendingDelete, setPendingDelete] = useState<ChatSession | null>(null);
  const groupedSessions = groupChatSessions(sessions);

  useEffect(() => {
    closeButtonRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab" || !asideRef.current) return;

      const focusable = Array.from(
        asideRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      );
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <motion.div
      className="absolute inset-0 z-40"
      initial={reduceMotion ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: reduceMotion ? 0 : 0.16 }}
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/55 backdrop-blur-[2px]"
        onClick={onClose}
        aria-label="Close chat history"
      />

      <motion.aside
        ref={asideRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="chat-history-title"
        className="absolute inset-y-0 left-0 flex w-[min(90vw,360px)] flex-col border-r border-white/[0.08] bg-[#111113]/96 shadow-[28px_0_80px_rgba(0,0,0,0.52)] backdrop-blur-2xl"
        initial={reduceMotion ? false : { x: -28, opacity: 0.8 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: -28, opacity: 0 }}
        transition={{
          duration: reduceMotion ? 0 : 0.2,
          ease: [0.16, 1, 0.3, 1],
        }}
      >
        <header className="flex h-16 shrink-0 items-center gap-2 border-b border-white/[0.06] px-4">
          <h2
            id="chat-history-title"
            className="mr-auto text-sm font-semibold tracking-[-0.01em] text-white"
          >
            History
          </h2>
          <button
            type="button"
            disabled={isLoading}
            onClick={onNewSession}
            className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-white/10 bg-white px-3 text-sm font-medium text-black transition-transform hover:-translate-y-px disabled:cursor-wait disabled:opacity-60"
          >
            <Plus className="size-3.5" aria-hidden="true" />
            New chat
          </button>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            className="grid size-9 place-items-center rounded-full text-white/55 transition-colors hover:bg-white/[0.06] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
            aria-label="Close chat history"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </header>

        <div
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-3 [scrollbar-color:rgba(255,255,255,0.16)_transparent] [scrollbar-width:thin]"
          data-lenis-prevent
        >
          {isLoading ? (
            <div
              className="space-y-2"
              aria-label="Loading chat history"
              role="status"
            >
              {[0, 1, 2, 3].map((index) => (
                <div
                  key={index}
                  className="h-[68px] animate-pulse rounded-xl bg-white/[0.04]"
                />
              ))}
            </div>
          ) : groupedSessions.length ? (
            <div className="space-y-6">
              {groupedSessions.map((group) => (
                <section key={group.label} aria-labelledby={`history-${group.label.toLowerCase().replace(/\s+/g, "-")}`}>
                  <h3
                    id={`history-${group.label.toLowerCase().replace(/\s+/g, "-")}`}
                    className="mb-2 px-3 text-[10px] font-medium uppercase tracking-[0.16em] text-white/32"
                  >
                    {group.label}
                  </h3>
                  <div className="space-y-2">
                    {group.sessions.map((session) => {
                      const sessionIndex = sessions.findIndex(
                        (entry) => entry.id === session.id,
                      );
                      return (
                        <PrometheusChatHistoryRow
                          key={session.id}
                          active={session.id === currentSessionId}
                          disabled={isLoading}
                          index={sessionIndex}
                          session={session}
                          onSelect={(selectedSession) => {
                            onSelectSession(selectedSession.id);
                            onClose();
                          }}
                          onRename={onRenameSession}
                          onDelete={setPendingDelete}
                        />
                      );
                    })}
                  </div>
                </section>
              ))}
            </div>
          ) : (
            <div className="px-5 py-14 text-center">
              <p className="text-sm text-white/55">No saved chats yet.</p>
              <p className="mt-2 text-xs leading-5 text-white/32">
                Your first message will create one.
              </p>
            </div>
          )}
        </div>

        <AnimatePresence>
          {pendingDelete ? (
            <motion.div
              className="absolute inset-0 z-20 grid place-items-center bg-black/70 p-5"
              initial={reduceMotion ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              role="alertdialog"
              aria-modal="true"
              aria-labelledby="delete-chat-title"
            >
              <motion.div
                className="w-full max-w-xs rounded-2xl border border-white/[0.08] bg-[#202023] p-4 shadow-2xl"
                initial={reduceMotion ? false : { opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
              >
                <h4 id="delete-chat-title" className="text-sm font-semibold text-white">
                  Delete this chat?
                </h4>
                <p className="mt-2 text-sm text-white/55">
                  This cannot be undone.
                </p>
                <div className="mt-5 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setPendingDelete(null)}
                    className="rounded-xl px-3 py-1.5 text-sm text-white/70 hover:bg-white/[0.06] hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onDeleteSession(pendingDelete.id);
                      setPendingDelete(null);
                    }}
                    className="rounded-xl bg-red-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-400"
                  >
                    Delete
                  </button>
                </div>
              </motion.div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </motion.aside>
    </motion.div>
  );
}
