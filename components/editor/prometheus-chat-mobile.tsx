"use client";

import { AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, type TouchEvent } from "react";
import { toast } from "sonner";

import { useAuth } from "@/components/auth/auth-provider";
import { ChatMessageBubble } from "@/components/chat/chat-message-bubble";
import { MobileChatInput } from "@/components/chat/mobile-chat-input";
import { AIChatHistoryButton } from "@/components/editor/ai-chat-history-button";
import { ChatCarousel } from "@/components/editor/chat-carousel";
import { ChatSuggestions } from "@/components/editor/ai-chat-suggestions";
import { PrometheusChatHistoryDrawer } from "@/components/editor/prometheus-chat-history-drawer";
import { CinematicTextReveal } from "@/components/ui/cinematic-text-reveal";
import { useAIChat, type CarouselItem } from "@/hooks/use-ai-chat";
import { useCopyToClipboard } from "@/hooks/use-copy-to-clipboard";
import { useProfile } from "@/hooks/use-profile";
import { getChatGreeting } from "@/lib/user/display-name";
import { cn } from "@/lib/utils";

export function PrometheusChatMobile({
  projectId,
  onClose,
  workspaceTab = null,
}: {
  projectId: string | null;
  onClose: () => void;
  workspaceTab?: string | null;
}) {
  const { session } = useAuth();
  const { profile } = useProfile();
  const chat = useAIChat({ projectId });
  const { copy } = useCopyToClipboard();
  const messagesViewportRef = useRef<HTMLDivElement | null>(null);
  const pinnedToBottomRef = useRef(true);
  const dismissTouchStartRef = useRef<number | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const historyButtonRef = useRef<HTMLButtonElement | null>(null);
  const composerInputRef = useRef<HTMLTextAreaElement | null>(null);

  const scrollToLatest = useCallback(() => {
    if (!pinnedToBottomRef.current) return;
    messagesViewportRef.current?.scrollTo({
      top: messagesViewportRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, []);

  useEffect(() => {
    scrollToLatest();
  }, [chat.isAwaitingResponse, chat.messages, scrollToLatest]);

  const handleDismissTouchEnd = (event: TouchEvent<HTMLButtonElement>) => {
    const startY = dismissTouchStartRef.current;
    const endY = event.changedTouches[0]?.clientY;
    if (startY !== null && endY !== undefined && endY - startY > 72) onClose();
    dismissTouchStartRef.current = null;
  };

  const closeHistory = useCallback(() => {
    setHistoryOpen(false);
    window.requestAnimationFrame(() => historyButtonRef.current?.focus());
  }, []);

  // Stream-provided suggestions from the latest assistant turn override the
  // deterministic workspace-tab chips; older turns never leak forward.
  const turnSuggestions = useMemo(() => {
    for (let index = chat.messages.length - 1; index >= 0; index -= 1) {
      const message = chat.messages[index];
      if (message.role !== "assistant") continue;
      return message.suggestions && message.suggestions.length > 0 ? message.suggestions : undefined;
    }
    return undefined;
  }, [chat.messages]);

  const handleCarouselSelect = useCallback((item: CarouselItem) => {
    const message = item.payload?.message?.trim();
    if (!message) return;
    void chat.sendMessage(message);
  }, [chat.sendMessage]);
  const handleSuggestionSelect = useCallback((suggestion: string) => {
    chat.setDraft(suggestion);
    window.requestAnimationFrame(() => composerInputRef.current?.focus());
  }, [chat.setDraft]);
  const lastMessage = chat.messages[chat.messages.length - 1];
  const suggestionsHidden = chat.isSending || chat.isAwaitingResponse;

  return (
    <>
      <button
        type="button"
        className="fixed inset-0 z-50 bg-black/70"
        onClick={onClose}
        aria-label="Close mobile chat backdrop"
      />
      <section
        className="fixed inset-x-0 bottom-0 z-[60] flex h-[82dvh] max-h-[760px] flex-col overflow-hidden rounded-t-2xl border-t border-white/10 bg-black text-white"
        aria-label="Prometheus chat"
      >
        <button
          type="button"
          className="mx-auto mt-2 h-4 w-16 touch-none"
          aria-label="Drag down to close chat"
          onTouchStart={(event) => {
            dismissTouchStartRef.current = event.touches[0]?.clientY ?? null;
          }}
          onTouchEnd={handleDismissTouchEnd}
        >
          <span className="mx-auto block h-px w-10 bg-white/20" aria-hidden="true" />
        </button>
        <div className="absolute left-2 top-2 z-20">
          <AIChatHistoryButton
            buttonRef={historyButtonRef}
            open={historyOpen}
            onClick={() => setHistoryOpen((current) => !current)}
          />
        </div>

        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 z-10 grid size-10 place-items-center rounded-full text-white/45 transition-colors hover:bg-white/[0.05] hover:text-white"
          aria-label="Close chat"
        >
          <X className="size-4" />
        </button>

        <div
          ref={messagesViewportRef}
          onScroll={() => {
            const viewport = messagesViewportRef.current;
            if (!viewport) return;
            pinnedToBottomRef.current = viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight < 100;
          }}
          onTouchMove={(event) => event.stopPropagation()}
          className="min-h-0 flex-1 touch-pan-y overflow-y-auto overscroll-contain px-5 pb-8 pt-6"
          data-lenis-prevent
        >
          {chat.historyLoadError ? (
            <div
              className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-red-400/20 bg-red-400/[0.06] px-4 py-2 text-xs text-red-300/80"
              role="alert"
            >
              <span>{chat.historyLoadError}</span>
              <button
                type="button"
                onClick={chat.retryLoadSession}
                className="shrink-0 text-white/45 transition-colors hover:text-white"
              >
                Retry
              </button>
            </div>
          ) : null}
          {chat.messages.length === 0 && !chat.isAwaitingResponse ? (
            <div className="flex min-h-full items-center justify-center px-4 pb-16 text-center">
              <CinematicTextReveal
                as="h1"
                variant="measured"
                className="max-w-xl text-balance font-display text-[clamp(2.25rem,11vw,4.5rem)] font-normal leading-[0.96] tracking-normal text-white/92"
              >
                {getChatGreeting(session?.user, profile)}
              </CinematicTextReveal>
            </div>
          ) : (
            <div className="mx-auto w-full max-w-xl space-y-5 py-5">
              {chat.messages.map((message) => {
                const isUser = message.role === "user";
                return (
                  <article key={message.id} className={isUser ? "ml-auto max-w-[82%]" : "max-w-[88%]"}>
                    <ChatMessageBubble
                      role={message.role}
                      content={message.content}
                      isStreaming={!isUser && message.isComplete === false}
                      onStreamingProgress={(content) => chat.reportStreamingProgress(message.id, content)}
                      onStreamingComplete={() => chat.completeAssistantMessage(message.id)}
                      onCopy={() => void copy(message.content).then((copied) => copied ? toast.success("Copied to clipboard") : toast.error("Unable to copy message"))}
                      onEdit={isUser ? (content) => void chat.editAndResendMessage(message.id, content) : undefined}
                    />
                    {!isUser && message.carousel ? (
                      <ChatCarousel
                        items={message.carousel}
                        disabled={chat.isSending || chat.isAwaitingResponse}
                        onSelect={handleCarouselSelect}
                        className="mt-2"
                      />
                    ) : null}
                  </article>
                );
              })}
              {chat.isAwaitingResponse || chat.streamStatus ? <p className="text-sm text-white/38" role="status">{chat.streamStatus || "Thinking…"}</p> : null}
            </div>
          )}
        </div>

        {chat.error ? (
          <div className="flex items-center justify-between gap-3 border-t border-white/[0.05] px-5 py-2 text-xs text-red-300/80" role="alert">
            <span>{chat.error}</span>
            <button type="button" onClick={chat.clearError} className="shrink-0 text-white/45">Dismiss</button>
          </div>
        ) : null}

        <div
          className={cn(
            "shrink-0 px-4 pb-1 pt-3",
            suggestionsHidden && "invisible pointer-events-none",
          )}
        >
          <ChatSuggestions
            workspaceTab={workspaceTab}
            suggestions={turnSuggestions}
            hasProject={Boolean(projectId)}
            lastMessageRole={lastMessage?.role}
            layout="grid"
            className="mx-auto w-full max-w-xl"
            onSelect={handleSuggestionSelect}
          />
        </div>

        <MobileChatInput
          inputRef={composerInputRef}
          isStreaming={chat.isSending}
          value={chat.draft}
          onChange={chat.setDraft}
          onSend={() => void chat.sendMessage()}
          onStop={chat.stopStreaming}
        />
        <AnimatePresence>
          {historyOpen ? (
            <PrometheusChatHistoryDrawer
              currentSessionId={chat.currentSessionId}
              isLoading={chat.isHistoryLoading}
              sessions={chat.sessions}
              onClose={closeHistory}
              onNewSession={() => {
                void chat.createNewSession().then(() => setHistoryOpen(false));
              }}
              onSelectSession={chat.selectSession}
              onDeleteSession={(sessionId) => void chat.removeSession(sessionId)}
              onRenameSession={(sessionId, title) => void chat.renameSession(sessionId, title)}
            />
          ) : null}
        </AnimatePresence>
      </section>
    </>
  );
}
