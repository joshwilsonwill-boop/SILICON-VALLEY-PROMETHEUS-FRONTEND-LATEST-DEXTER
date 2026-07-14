"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Sparkles, X } from "lucide-react";
import { createPortal } from "react-dom";
import { useCallback, useEffect, useRef, useState } from "react";

import { useAuth } from "@/components/auth/auth-provider";
import { useAIChat } from "@/hooks/use-ai-chat";
import { useProfile } from "@/hooks/use-profile";
import { getChatGreeting } from "@/lib/user/display-name";

import { AIChatHistoryButton } from "./ai-chat-history-button";
import { AIChatHistoryPanel } from "./ai-chat-history-panel";
import { AIChatInput } from "./ai-chat-input";
import { AIChatMessage } from "./ai-chat-message";
import { AIChatOrb } from "./ai-chat-orb";
import { AIChatSuggestions } from "./ai-chat-suggestions";
import { AIChatTypingIndicator } from "./ai-chat-typing-indicator";

export function AIChatOverlay({
  isOpen,
  onClose,
  projectId,
}: {
  isOpen: boolean;
  onClose: () => void;
  projectId: string | null;
}) {
  const { session } = useAuth();
  const { profile } = useProfile();
  const [mounted, setMounted] = useState(false);
  const [showTopics, setShowTopics] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const messagesContainerRef = useRef<HTMLDivElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const isNearBottomRef = useRef(true);
  const {
    clearError,
    completeAssistantMessage,
    createNewSession,
    currentSessionId,
    draft,
    error,
    isAwaitingResponse,
    isHistoryLoading,
    isSending,
    messages,
    removeSession,
    selectSession,
    sendMessage,
    sessions,
    setDraft,
  } = useAIChat({ projectId, enabled: isOpen });

  const scrollToBottomIfNeeded = useCallback(() => {
    if (!isNearBottomRef.current) return;
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, []);

  const handleMessagesScroll = useCallback(() => {
    const container = messagesContainerRef.current;
    if (!container) return;
    isNearBottomRef.current = container.scrollHeight - container.scrollTop - container.clientHeight < 100;
  }, []);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (isOpen) scrollToBottomIfNeeded();
  }, [isAwaitingResponse, isOpen, isSending, messages, scrollToBottomIfNeeded]);

  const requestClose = () => {
    if (draft.trim() && !window.confirm("Discard your unsent message?")) return;
    onClose();
  };

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      requestClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {isOpen ? (
        <motion.div
          className="fixed inset-0 z-[60] flex items-stretch bg-black/50 backdrop-blur-[24px] saturate-[1.2] md:items-center md:justify-center md:p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) requestClose();
          }}
        >
          <motion.section
            aria-label="AI Assistant"
            aria-modal="true"
            role="dialog"
            initial={{ opacity: 0, scale: 0.92, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className={`relative flex h-[100dvh] w-full flex-col overflow-hidden border border-white/[0.06] bg-[#1c1c1e]/95 text-white shadow-2xl shadow-black/60 md:h-auto md:max-h-[85vh] ${showHistory ? "md:max-w-4xl" : "md:max-w-lg"} md:rounded-3xl`}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <header className="flex h-[60px] shrink-0 items-center justify-between border-b border-white/[0.06] px-5">
              <div className="flex items-center gap-2.5">
                <Sparkles className="size-4 text-green-400" aria-hidden="true" />
                <h2 className="text-sm font-semibold text-white">AI Assistant</h2>
              </div>
              <div className="flex items-center gap-1">
                <AIChatHistoryButton onClick={() => setShowHistory(true)} />
                <button
                  type="button"
                  onClick={requestClose}
                  className="grid size-10 place-items-center rounded-full text-white/60 transition-colors hover:bg-white/[0.06] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
                  aria-label="Close AI Assistant"
                >
                  <X className="size-5" aria-hidden="true" />
                </button>
              </div>
            </header>

            <div ref={messagesContainerRef} onScroll={handleMessagesScroll} className="min-h-0 flex-1 overflow-y-auto scroll-smooth px-5 py-5">
              {messages.length === 0 ? (
                <div className="flex min-h-full flex-col items-center justify-center py-6">
                  <AIChatOrb />
                  <p className="mt-5 max-w-xs text-center text-lg leading-relaxed text-white/50">
                    {getChatGreeting(session?.user, profile)}
                  </p>
                  <div className="mt-6 w-full max-w-sm">
                    <AIChatSuggestions
                      expanded={showTopics}
                      onSelect={(suggestion) => void sendMessage(suggestion)}
                      onToggle={() => setShowTopics((visible) => !visible)}
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {messages.map((message) => (
                    <AIChatMessage
                      key={message.id}
                      message={message}
                      onStreamingComplete={completeAssistantMessage}
                      onStreamingProgress={scrollToBottomIfNeeded}
                    />
                  ))}
                  {isAwaitingResponse ? <AIChatTypingIndicator /> : null}
                  {error ? (
                    <div className="rounded-xl border border-red-400/20 bg-red-400/10 p-3 text-sm text-red-100" role="alert">
                      <div className="flex items-center justify-between gap-3">
                        <span>{error}</span>
                        <button type="button" onClick={clearError} className="shrink-0 text-xs text-red-100/75 underline underline-offset-2 hover:text-white">
                          Dismiss
                        </button>
                      </div>
                    </div>
                  ) : null}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            <AIChatInput
              disabled={isSending}
              onChange={setDraft}
              onSend={() => void sendMessage()}
              onTopics={() => setShowTopics((visible) => !visible)}
              value={draft}
            />
            {showTopics && messages.length > 0 ? (
              <div className="border-t border-white/[0.06] px-5 py-3">
                <AIChatSuggestions expanded onSelect={(suggestion) => void sendMessage(suggestion)} />
              </div>
            ) : null}
            <AnimatePresence>
              {showHistory ? (
                <AIChatHistoryPanel
                  currentSessionId={currentSessionId}
                  isLoading={isHistoryLoading}
                  sessions={sessions}
                  onClose={() => setShowHistory(false)}
                  onNewSession={() => void createNewSession()}
                  onSelectSession={selectSession}
                  onDeleteSession={(sessionId) => void removeSession(sessionId)}
                />
              ) : null}
            </AnimatePresence>
          </motion.section>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}
