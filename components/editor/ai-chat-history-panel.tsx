"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Plus, X } from "lucide-react";
import { useState } from "react";

import type { ChatSession } from "@/lib/supabase/chat-sessions";

import { AIChatSessionItem } from "./ai-chat-session-item";

export function AIChatHistoryPanel({
  currentSessionId,
  isLoading,
  onClose,
  onDeleteSession,
  onNewSession,
  onSelectSession,
  sessions,
}: {
  currentSessionId: string | null;
  isLoading: boolean;
  onClose: () => void;
  onDeleteSession: (sessionId: string) => void;
  onNewSession: () => void;
  onSelectSession: (sessionId: string) => void;
  sessions: ChatSession[];
}) {
  const [pendingDelete, setPendingDelete] = useState<ChatSession | null>(null);

  return (
    <motion.aside
      aria-label="Chat history"
      className="absolute inset-0 z-10 flex flex-col border-l border-white/[0.06] bg-[#1c1c1e]/95 backdrop-blur-xl md:inset-y-0 md:left-auto md:right-0 md:w-80"
      initial={{ opacity: 0, x: 32 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 32 }}
      transition={{ duration: 0.18, ease: "easeOut" }}
    >
      <header className="flex h-[60px] shrink-0 items-center gap-2 border-b border-white/[0.06] px-4">
        <h3 className="mr-auto text-sm font-semibold text-white">Chat History</h3>
        <button
          type="button"
          disabled={isLoading}
          onClick={onNewSession}
          className="inline-flex h-8 items-center gap-1.5 rounded-xl bg-white px-3 text-sm font-medium text-black transition-opacity hover:opacity-90 disabled:cursor-wait disabled:opacity-60"
        >
          <Plus className="size-3.5" aria-hidden="true" />
          New Chat
        </button>
        <button
          type="button"
          onClick={onClose}
          className="grid size-9 place-items-center rounded-full text-white/60 transition-colors hover:bg-white/[0.06] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
          aria-label="Close chat history"
        >
          <X className="size-4" aria-hidden="true" />
        </button>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        {isLoading ? (
          <div className="space-y-2" aria-label="Loading chat history" role="status">
            {[0, 1, 2, 3].map((index) => <div key={index} className="h-[68px] animate-pulse rounded-xl bg-white/[0.04]" />)}
          </div>
        ) : sessions.length ? (
          <div className="space-y-2">
            {sessions.map((session) => (
              <AIChatSessionItem
                key={session.id}
                active={session.id === currentSessionId}
                disabled={isLoading}
                session={session}
                onSelect={(selectedSession) => onSelectSession(selectedSession.id)}
                onDelete={setPendingDelete}
              />
            ))}
          </div>
        ) : (
          <p className="px-3 py-8 text-center text-sm text-white/40">No chats yet. Start a new conversation!</p>
        )}
      </div>

      <AnimatePresence>
        {pendingDelete ? (
          <motion.div
            className="absolute inset-0 z-20 grid place-items-center bg-black/60 p-5"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="delete-chat-title"
          >
            <motion.div
              className="w-full max-w-xs rounded-2xl border border-white/[0.08] bg-[#2c2c2e] p-4 shadow-2xl"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
            >
              <h4 id="delete-chat-title" className="text-sm font-semibold text-white">Delete this chat?</h4>
              <p className="mt-2 text-sm text-white/60">This cannot be undone.</p>
              <div className="mt-5 flex justify-end gap-2">
                <button type="button" onClick={() => setPendingDelete(null)} className="rounded-xl px-3 py-1.5 text-sm text-white/70 hover:bg-white/[0.06] hover:text-white">Cancel</button>
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
  );
}
