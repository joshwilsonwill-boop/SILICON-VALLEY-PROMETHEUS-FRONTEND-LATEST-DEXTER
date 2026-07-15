"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, History, Plus, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState, type TouchEvent } from "react";
import { toast } from "sonner";

import { useAuth } from "@/components/auth/auth-provider";
import { ChatMessageBubble } from "@/components/chat/chat-message-bubble";
import { MobileChatInput } from "@/components/chat/mobile-chat-input";
import { useAIChat } from "@/hooks/use-ai-chat";
import { useCopyToClipboard } from "@/hooks/use-copy-to-clipboard";
import { useProfile } from "@/hooks/use-profile";
import { useVoiceInput } from "@/hooks/use-voice-input";
import { getChatGreeting } from "@/lib/user/display-name";

import { AIChatOrb } from "./ai-chat-orb";
import { AIChatSuggestions } from "./ai-chat-suggestions";
import { PrometheusChatSessionMenu } from "./prometheus-chat-session-menu";
import { PrometheusChatThinkingProcess } from "./prometheus-chat-thinking-process";

function formatTimestamp(value: string) {
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(new Date(value));
}

export function PrometheusChatMobile({ projectId, onClose }: { projectId: string | null; onClose: () => void }) {
  const { session } = useAuth();
  const { profile } = useProfile();
  const chat = useAIChat({ projectId });
  const { copy } = useCopyToClipboard();
  const voice = useVoiceInput(
    chat.setDraft,
    () => window.setTimeout(() => void chat.sendMessage(), 2_000),
  );
  const [historyOpen, setHistoryOpen] = useState(false);
  const [expandedSuggestions, setExpandedSuggestions] = useState(false);
  const [historyActionSession, setHistoryActionSession] = useState<{ id: string; title: string } | null>(null);
  const messagesViewportRef = useRef<HTMLDivElement | null>(null);
  const pinnedToBottomRef = useRef(true);
  const dismissTouchStartRef = useRef<number | null>(null);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const longPressRef = useRef<number | null>(null);
  const ignoreNextSessionSelectRef = useRef(false);

  const scrollToLatest = useCallback(() => {
    if (!pinnedToBottomRef.current) return;
    messagesViewportRef.current?.scrollTo({ top: messagesViewportRef.current.scrollHeight, behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToLatest();
  }, [chat.isAwaitingResponse, chat.messages, scrollToLatest]);

  const handleScroll = () => {
    const viewport = messagesViewportRef.current;
    if (!viewport) return;
    pinnedToBottomRef.current = viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight < 100;
  };

  const renameSession = (sessionId: string, title: string) => {
    const nextTitle = window.prompt("Rename chat", title);
    if (nextTitle?.trim()) void chat.renameSession(sessionId, nextTitle);
  };

  const deleteSession = (sessionId: string, title: string) => {
    if (window.confirm(`Delete ${title}? This cannot be undone.`)) void chat.removeSession(sessionId);
  };

  const handleDismissTouchEnd = (event: TouchEvent<HTMLButtonElement>) => {
    const startY = dismissTouchStartRef.current;
    const endY = event.changedTouches[0]?.clientY;
    if (startY !== null && endY !== undefined && endY - startY > 72) onClose();
    dismissTouchStartRef.current = null;
  };

  return (
    <>
      <button type="button" className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" onClick={onClose} aria-label="Close mobile chat backdrop" />
      <motion.section
      className="fixed inset-x-0 bottom-0 z-[60] flex h-[82dvh] max-h-[760px] flex-col overflow-hidden rounded-t-2xl border-t border-white/10 bg-[#101012]/95 text-white shadow-[0_-24px_80px_rgba(0,0,0,0.55)] backdrop-blur-2xl"
      initial={{ y: "100%" }}
      animate={{ y: 0 }}
      exit={{ y: "100%" }}
      transition={{ type: "spring", stiffness: 330, damping: 32 }}
      aria-label="Prometheus chat"
    >
      <button
        type="button"
        className="mx-auto mt-2 h-4 w-16 touch-none"
        aria-label="Drag down to close chat"
        onTouchStart={(event) => { dismissTouchStartRef.current = event.touches[0]?.clientY ?? null; }}
        onTouchEnd={handleDismissTouchEnd}
      >
        <span className="mx-auto block h-1 w-10 rounded-full bg-white/20" aria-hidden="true" />
      </button>
      <header className="flex h-12 shrink-0 items-center border-b border-white/[0.06] px-4">
        <button type="button" onClick={() => setHistoryOpen(true)} className="grid size-9 place-items-center text-white/60 hover:text-white" aria-label="Open chat history">
          <History className="size-4" />
        </button>
        <p className="mx-auto truncate text-xs font-medium text-white/75">{chat.sessions.find((item) => item.id === chat.currentSessionId)?.title ?? "New Chat"}</p>
        <button type="button" onClick={onClose} className="grid size-9 place-items-center text-white/60 hover:text-white" aria-label="Close chat">
          <X className="size-4" />
        </button>
      </header>

      <div ref={messagesViewportRef} onScroll={handleScroll} onTouchMove={(event) => event.stopPropagation()} className="min-h-0 flex-1 touch-pan-y overflow-y-auto overscroll-contain px-4 py-5">
        {chat.messages.length === 0 ? (
          <div className="flex min-h-full flex-col items-center justify-center pb-6 text-center">
            <AIChatOrb className="size-14" />
            <p className="mt-5 max-w-xs text-sm leading-relaxed text-white/55">{getChatGreeting(session?.user, profile)}</p>
            <div className="mt-6 w-full max-w-sm">
              <AIChatSuggestions
                expanded={expandedSuggestions}
                onSelect={(suggestion) => void chat.sendMessage(suggestion)}
                onToggle={() => setExpandedSuggestions((value) => !value)}
              />
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {chat.messages.map((message) => {
              const isUser = message.role === "user";
              return (
                <article key={message.id} className={isUser ? "ml-auto max-w-[82%]" : "max-w-[88%]"}>
                  {!isUser && message.isComplete === false ? <PrometheusChatThinkingProcess active /> : null}
                  <ChatMessageBubble
                    role={message.role}
                    content={message.content}
                    isStreaming={!isUser && message.isComplete === false}
                    onStreamingProgress={(content) => chat.reportStreamingProgress(message.id, content)}
                    onStreamingComplete={() => chat.completeAssistantMessage(message.id)}
                    onCopy={() => void copy(message.content).then((copied) => copied ? toast.success("Copied to clipboard") : toast.error("Unable to copy message"))}
                    onEdit={isUser ? (content) => void chat.editAndResendMessage(message.id, content) : undefined}
                  />
                </article>
              );
            })}
            {chat.isAwaitingResponse ? <PrometheusChatThinkingProcess active /> : null}
          </div>
        )}
      </div>

      <MobileChatInput
        isListening={voice.isListening}
        isStreaming={chat.isSending}
        value={chat.draft}
        onChange={chat.setDraft}
        onSend={() => void chat.sendMessage()}
        onStop={chat.stopStreaming}
        onVoice={() => voice.isListening ? voice.stopListening() : voice.startListening()}
      />

      <AnimatePresence>
        {historyOpen ? (
          <motion.aside className="absolute inset-0 z-20 flex flex-col bg-[#101012]" initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} transition={{ duration: 0.2 }} aria-label="Chat history">
            <header className="flex h-14 shrink-0 items-center border-b border-white/[0.06] px-4">
              <button type="button" onClick={() => setHistoryOpen(false)} className="grid size-9 place-items-center text-white/60" aria-label="Close chat history"><ChevronLeft className="size-5" /></button>
              <h2 className="ml-2 text-sm font-medium">Chat History</h2>
              <button type="button" onClick={() => void chat.createNewSession()} className="ml-auto inline-flex items-center gap-1.5 rounded-lg bg-white px-2.5 py-1.5 text-xs font-medium text-black"><Plus className="size-3.5" /> New</button>
            </header>
            <div className="min-h-0 flex-1 overflow-y-auto p-3">
              {chat.sessions.map((item) => (
                <div
                  key={item.id}
                  className={`group mb-2 flex items-center gap-2 rounded-xl border p-3 ${item.id === chat.currentSessionId ? "border-white/[0.12] bg-white/[0.06]" : "border-transparent bg-white/[0.03]"}`}
                  onTouchStart={(event) => {
                    const touch = event.touches[0];
                    touchStartRef.current = touch ? { x: touch.clientX, y: touch.clientY } : null;
                    longPressRef.current = window.setTimeout(() => {
                      ignoreNextSessionSelectRef.current = true;
                      setHistoryActionSession({ id: item.id, title: item.title });
                    }, 550);
                  }}
                  onTouchEnd={(event) => {
                    if (longPressRef.current) window.clearTimeout(longPressRef.current);
                    const touch = event.changedTouches[0];
                    const start = touchStartRef.current;
                    if (touch && start && touch.clientX - start.x < -70) deleteSession(item.id, item.title);
                    touchStartRef.current = null;
                  }}
                >
                  <button type="button" onClick={() => {
                    if (ignoreNextSessionSelectRef.current) {
                      ignoreNextSessionSelectRef.current = false;
                      return;
                    }
                    chat.selectSession(item.id);
                    setHistoryOpen(false);
                  }} className="min-w-0 flex-1 text-left">
                    <p className="truncate text-sm text-white">{item.title}</p>
                    <p className="mt-1 text-xs text-white/40">{formatTimestamp(item.updated_at)}</p>
                  </button>
                  <PrometheusChatSessionMenu onRename={() => renameSession(item.id, item.title)} onDelete={() => deleteSession(item.id, item.title)} />
                </div>
              ))}
            </div>
            {historyActionSession ? (
              <div className="absolute inset-0 z-10 flex items-end bg-black/45 p-3" onClick={() => setHistoryActionSession(null)}>
                <div className="w-full rounded-xl border border-white/[0.1] bg-[#1b1b1e] p-2" onClick={(event) => event.stopPropagation()}>
                  <p className="px-3 py-2 text-xs text-white/45">{historyActionSession.title}</p>
                  <button type="button" onClick={() => { renameSession(historyActionSession.id, historyActionSession.title); setHistoryActionSession(null); }} className="w-full rounded-lg px-3 py-2.5 text-left text-sm text-white hover:bg-white/[0.08]">Rename</button>
                  <button type="button" onClick={() => { deleteSession(historyActionSession.id, historyActionSession.title); setHistoryActionSession(null); }} className="w-full rounded-lg px-3 py-2.5 text-left text-sm text-red-300 hover:bg-red-400/10">Delete</button>
                </div>
              </div>
            ) : null}
          </motion.aside>
        ) : null}
      </AnimatePresence>
      </motion.section>
    </>
  );
}
