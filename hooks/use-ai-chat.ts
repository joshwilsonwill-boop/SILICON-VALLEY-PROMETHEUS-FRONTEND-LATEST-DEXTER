"use client";

import { useCallback, useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { toast } from "sonner";

import { parseEditorActionDrafts, type EditorActionDraft } from "@/lib/editor-actions";
import { classifyPrometheusChatIntent } from "@/lib/prometheus-assistant/chat-intent";
import { consumePrometheusChatStream } from "@/lib/prometheus-assistant/chat-stream-client";
import type { PrometheusChatStreamEvent } from "@/lib/prometheus-assistant/chat-stream";
import { buildPrometheusChatMemory } from "@/lib/prometheus-assistant/chat-memory";
import { normalizeChatJobs, normalizeChatMedia, type ChatMediaItem, type ChatMediaJob } from "@/lib/prometheus-assistant/chat-media";
import type { ChatEditorContext, ChatFrameThumb } from "@/lib/prometheus-assistant/editor-context";
import { deleteChatMessages, getChatMessages, insertChatMessage, insertChatMessages, isMissingClientMessageIdError, type ChatMessageInsert } from "@/lib/supabase/chat-messages";
import {
  createChatSession,
  deleteChatSession,
  getProjectChatSessions,
  getUserChatSessions,
  type ChatSession,
  updateChatSessionTitle,
} from "@/lib/supabase/chat-sessions";

export type AIChatPlatform =
  | "twitter"
  | "instagram"
  | "linkedin"
  | "tiktok"
  | "youtube";

export type AIChatPostType =
  | "caption"
  | "thread"
  | "script"
  | "description"
  | "calendar";

export type AIChatFrameReference = {
  id: string;
  label: string;
  timecode: string;
  seconds?: number;
  thumbnailUrl: string | null;
  reason: string;
};

export type CarouselItemKind = "action" | "style" | "asset" | "music" | "font" | "template";

export type CarouselItem = {
  id: string;
  kind: CarouselItemKind;
  title: string;
  subtitle?: string;
  image?: string;
  badge?: string;
  payload?: {
    message?: string;
    tool?: string;
    args?: Record<string, unknown>;
  };
};

export type AIChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
  isComplete?: boolean;
  platform?: AIChatPlatform;
  postType?: AIChatPostType;
  frames?: AIChatFrameReference[];
  toolCalls?: unknown[];
  actionDrafts?: EditorActionDraft[];
  carousel?: CarouselItem[];
  suggestions?: string[];
  media?: ChatMediaItem[];
  jobs?: ChatMediaJob[];
};

export type AIChatActivity =
  | { id: string; kind: "status"; label: string; state: "active" | "complete" }
  | {
      id: string;
      kind: "tool";
      label: string;
      detail: string;
      state: "completed" | "needs_approval" | "failed";
    };

export type AIChatLiveContext = ChatEditorContext & { frameThumbs?: ChatFrameThumb[] };

export type AIChatContextProvider = () => AIChatLiveContext | null;

const SOCIAL_STRATEGIST_CONTEXT =
  "Act as a social media content strategist for video creators. Tailor posts, hooks, calls to action, and hashtags to the requested platform.";

export function useAIChat({
  projectId,
  enabled = true,
  contextProvider,
}: {
  projectId: string | null;
  enabled?: boolean;
  contextProvider?: AIChatContextProvider;
}) {
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState<AIChatMessage[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [isAwaitingResponse, setIsAwaitingResponse] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [historyLoadError, setHistoryLoadError] = useState<string | null>(null);
  const [streamStatus, setStreamStatus] = useState<string | null>(null);
  const [streamActivity, setStreamActivity] = useState<AIChatActivity[]>([]);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const messagesRef = useRef<AIChatMessage[]>([]);
  const abortControllerRef = useRef<AbortController | null>(null);
  const currentSessionIdRef = useRef<string | null>(null);
  const memorySessionIdRef = useRef<string | null>(null);
  const creatingSessionRef = useRef<Promise<ChatSession> | null>(null);
  const pendingAssistantMessagesRef = useRef(new Map<string, { message: AIChatMessage; sessionId: string | null }>());
  const streamedContentRef = useRef(new Map<string, string>());
  const contextProviderRef = useRef<AIChatContextProvider | undefined>(contextProvider);
  const failedPersistRef = useRef<{ sessionId: string; payload: ChatMessageInsert } | null>(null);
  const lastLoadAttemptRef = useRef<string | null>(null);
  const loadGenerationRef = useRef(0);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    contextProviderRef.current = contextProvider;
  }, [contextProvider]);

  const setActiveSessionId = useCallback((sessionId: string | null) => {
    currentSessionIdRef.current = sessionId;
    setCurrentSessionId(sessionId);
  }, []);

  const refreshSessions = useCallback(async () => {
    const nextSessions = projectId
      ? await getProjectChatSessions(projectId)
      : await getUserChatSessions();
    setSessions(nextSessions);
    return nextSessions;
  }, [projectId]);

  const ensureSession = useCallback(async () => {
    if (currentSessionIdRef.current) return currentSessionIdRef.current;
    if (!creatingSessionRef.current) {
      creatingSessionRef.current = createChatSession(projectId).then((session) => {
        setActiveSessionId(session.id);
        setSessions((current) => [session, ...current.filter((entry) => entry.id !== session.id)]);
        return session;
      });
    }

    try {
      return (await creatingSessionRef.current).id;
    } finally {
      creatingSessionRef.current = null;
    }
  }, [projectId, setActiveSessionId]);

  useEffect(() => {
    if (!enabled) return;
    let disposed = false;

    async function initializeHistory() {
      setIsHistoryLoading(true);
      try {
        const nextSessions = await refreshSessions();
        if (disposed) return;
        const requestedSessionId = new URLSearchParams(window.location.search).get("chat_session");
        const requestedSession = nextSessions.find((session) => session.id === requestedSessionId);
        if (requestedSession) {
          setActiveSessionId(requestedSession.id);
        } else if (nextSessions[0]) {
          setActiveSessionId(nextSessions[0].id);
        }
      } catch {
        // Chat remains usable without persistence when the user is signed out or Supabase is unavailable.
      } finally {
        if (!disposed) setIsHistoryLoading(false);
      }
    }

    void initializeHistory();
    return () => {
      disposed = true;
    };
  }, [enabled, ensureSession, refreshSessions, setActiveSessionId]);

  const loadSessionMessages = useCallback(async (sessionId: string, isDisposed?: () => boolean) => {
    const generation = ++loadGenerationRef.current;
    lastLoadAttemptRef.current = sessionId;
    setIsHistoryLoading(true);
    try {
      const records = await getChatMessages(sessionId);
      if (isDisposed?.() || generation !== loadGenerationRef.current || currentSessionIdRef.current !== sessionId) return;
      // Only swap the thread once the fetch succeeds, so a failed load never
      // leaves the user staring at a silent empty thread.
      const restoredMessages = records
          .filter((record) => record.role === "user" || record.role === "assistant")
          .map((record) => ({
            id: record.id,
            role: record.role === "assistant" ? "assistant" : "user",
            content: record.content,
            createdAt: record.created_at,
            isComplete: true,
            platform: record.platform as AIChatPlatform | undefined,
            postType: record.post_type as AIChatPostType | undefined,
            ...normalizePersistedMessageMetadata(record.metadata),
          } satisfies AIChatMessage));
      // Keep the model-facing memory in lockstep with the restored UI. Waiting
      // for the React effect leaves a brief refresh race where the visible
      // thread is populated but the next request is sent with stale history.
      messagesRef.current = restoredMessages;
      memorySessionIdRef.current = sessionId;
      setMessages(restoredMessages);
      setHistoryLoadError(null);
    } catch (err) {
      // A failed history load must not discard the existing send-message flow.
      console.warn("[use-ai-chat] history load failed", err);
      if (isDisposed?.() || generation !== loadGenerationRef.current) return;
      const message = isMissingClientMessageIdError(err)
        ? "This conversation can't be shown yet: the database is missing a pending chat update (client_message_id)."
        : "This conversation couldn't be loaded. Check your connection and try again.";
      setHistoryLoadError(message);
      toast.error("Couldn't load this conversation");
    } finally {
      if (!isDisposed?.() && generation === loadGenerationRef.current) setIsHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!enabled || !currentSessionId) return;
    const sessionId = currentSessionId;
    let disposed = false;

    void loadSessionMessages(sessionId, () => disposed);
    return () => {
      disposed = true;
    };
  }, [currentSessionId, enabled, loadSessionMessages]);

  useEffect(() => {
    if (!enabled || !currentSessionId) return;
    const url = new URL(window.location.href);
    if (url.searchParams.get("chat_session") === currentSessionId) return;
    url.searchParams.set("chat_session", currentSessionId);
    window.history.replaceState({}, "", url);
  }, [currentSessionId, enabled]);

  const sendMessage = useCallback(
    async (message?: string, options?: { history?: AIChatMessage[]; persistUser?: boolean; reuseMessage?: AIChatMessage }) => {
      const text = (message ?? draft).trim();
      const activeSessionId = currentSessionIdRef.current;
      const isSessionMemoryReady = !activeSessionId || memorySessionIdRef.current === activeSessionId;
      if (!text || isSending || isHistoryLoading || !isSessionMemoryReady) return;

      const userMessage = options?.reuseMessage ?? {
        id: `user-${crypto.randomUUID()}`,
        role: "user",
        content: text,
        createdAt: new Date().toISOString(),
        isComplete: true,
      } satisfies AIChatMessage;
      const history = buildPrometheusChatMemory(options?.history ?? messagesRef.current);

      if (!options?.reuseMessage) setMessages((current) => [...current, userMessage]);
      setDraft("");
      setError(null);
      setIsSending(true);
      setIsAwaitingResponse(true);
      setStreamStatus("Preparing response");
      setStreamActivity([
        { id: "status-preparing", kind: "status", label: "Preparing response", state: "active" },
      ]);

      abortControllerRef.current?.abort();
      const controller = new AbortController();
      abortControllerRef.current = controller;
      let renderFrame: number | null = null;
      let activeAssistantMessageId: string | null = null;

      try {
        const sessionId = await ensureSession().catch(() => {
          setSaveState("error");
          setError("This chat is temporary because history is unavailable.");
          return null;
        });
        if (sessionId && options?.persistUser !== false) {
          setSaveState("saving");
          try {
            await insertChatMessage(sessionId, {
              role: "user",
              content: text,
              client_message_id: userMessage.id,
              ...inferPostMetadata(text),
            });
            setSaveState("saved");
            void refreshSessions();
          } catch (persistError) {
            console.warn("[use-ai-chat] user message persist failed", persistError);
            const meta = inferPostMetadata(text);
            failedPersistRef.current = {
              sessionId,
              payload: {
                role: "user",
                content: text,
                client_message_id: userMessage.id,
                platform: meta.platform ?? null,
                post_type: meta.postType ?? null,
              },
            };
            setSaveState("error");
          }
        }

        const intent = classifyPrometheusChatIntent(text);
        const assistantMessageId = `assistant-${crypto.randomUUID()}`;

        activeAssistantMessageId = assistantMessageId;
        let liveContext: AIChatLiveContext | null = null;
        try {
          liveContext = contextProviderRef.current?.() ?? null;
        } catch {
          liveContext = null;
        }
        const { frameThumbs: liveFrameThumbs, ...liveEditorContext } = liveContext ?? {};
        const response = await fetch("/api/prometheus-chat/stream", {
          method: "POST",
          headers: {
            Accept: "application/x-ndjson",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            message: text,
            messages: history,
            originalPrompt: intent.useSocialStrategist ? SOCIAL_STRATEGIST_CONTEXT : undefined,
            projectId,
            sessionId,
            verbosity: "normal",
            clientMessageId: assistantMessageId,
            ...(liveContext
              ? { editorContext: liveEditorContext, frameThumbs: liveFrameThumbs ?? [] }
              : {}),
          }),
          signal: controller.signal,
        });

        const assistantMessage: AIChatMessage = {
          id: assistantMessageId,
          role: "assistant",
          content: "",
          createdAt: new Date().toISOString(),
          isComplete: false,
        };
        pendingAssistantMessagesRef.current.set(assistantMessage.id, { message: assistantMessage, sessionId });
        streamedContentRef.current.set(assistantMessage.id, "");
        setMessages((current) => [...current, assistantMessage]);
        setIsAwaitingResponse(false);
        let reply = "";
        let persistedByServer = false;
        let streamFrames: AIChatFrameReference[] = [];
        let streamToolCalls: unknown[] = [];
        let streamActionDrafts: EditorActionDraft[] = [];
        let streamCarousel: CarouselItem[] = [];
        let streamSuggestions: string[] = [];

        const flushReply = () => {
          renderFrame = null;
          const content = reply;
          setMessages((current) =>
            current.map((entry) =>
              entry.id === assistantMessage.id
                ? { ...entry, content, isComplete: false }
                : entry,
            ),
          );
        };

        const handleStreamEvent = (event: PrometheusChatStreamEvent) => {
          if (event.type === "status") {
            setStreamStatus(event.message);
            setStreamActivity((current) => {
              const entries = current.map((entry) =>
                entry.kind === "status" && entry.state === "active"
                  ? { ...entry, state: "complete" as const }
                  : entry,
              );
              return [
                ...entries,
                {
                  id: `status-${entries.length}-${event.message}`,
                  kind: "status" as const,
                  label: event.message,
                  state: "active" as const,
                },
              ].slice(-7);
            });
            return;
          }
          if (event.type === "tool") {
            setStreamActivity((current) => [
              ...current.map((entry) =>
                entry.kind === "status" && entry.state === "active"
                  ? { ...entry, state: "complete" as const }
                  : entry,
              ),
              {
                id: event.toolCall.id,
                kind: "tool" as const,
                label: event.toolCall.label,
                detail: event.toolCall.summary,
                state: event.toolCall.status,
              },
            ].slice(-7));
            return;
          }
          if (event.type === "delta") {
            reply += event.content;
            streamedContentRef.current.set(assistantMessage.id, reply);
            setStreamStatus(null);
            if (renderFrame === null) {
              renderFrame = window.requestAnimationFrame(flushReply);
            }
            return;
          }
          if (event.type === "metadata") {
            streamFrames = normalizeFrameReferenceList(event.frames);
            streamToolCalls = Array.isArray(event.toolCalls) ? event.toolCalls : [];
            streamActionDrafts = parseEditorActionDrafts(event.actionDrafts);
            streamCarousel = normalizeCarouselItems(event.carousel);
            streamSuggestions = normalizeSuggestionList(event.suggestions);
            return;
          }
          if (event.type === "done") {
            persistedByServer = event.persisted;
            return;
          }
          if (event.type === "error") {
            throw new Error(event.message);
          }
        };

        await consumePrometheusChatStream(response, handleStreamEvent);
        if (renderFrame !== null) {
          window.cancelAnimationFrame(renderFrame);
          renderFrame = null;
        }
        if (!reply.trim()) throw new Error("Prometheus returned an empty response.");

        pendingAssistantMessagesRef.current.delete(assistantMessage.id);
        streamedContentRef.current.delete(assistantMessage.id);
        setMessages((current) =>
          current.map((entry) =>
            entry.id === assistantMessage.id
              ? {
                  ...entry,
                  content: reply,
                  isComplete: true,
                  ...(streamFrames.length ? { frames: streamFrames } : {}),
                  ...(streamToolCalls.length ? { toolCalls: streamToolCalls } : {}),
                  ...(streamActionDrafts.length ? { actionDrafts: streamActionDrafts } : {}),
                  ...(streamCarousel.length ? { carousel: streamCarousel } : {}),
                  ...(streamSuggestions.length ? { suggestions: streamSuggestions } : {}),
                  ...inferPostMetadata(`${text}\n${reply}`),
                }
              : entry,
          ),
        );
        if (!persistedByServer && sessionId) {
          setSaveState("saving");
          const meta = inferPostMetadata(`${text}\n${reply}`);
          const payload: ChatMessageInsert = {
            role: "assistant",
            content: reply,
            client_message_id: assistantMessage.id,
            platform: meta.platform ?? null,
            post_type: meta.postType ?? null,
            metadata: {
              ...(streamFrames.length ? { frames: streamFrames } : {}),
              ...(streamToolCalls.length ? { toolCalls: streamToolCalls } : {}),
              ...(streamActionDrafts.length ? { actionDrafts: streamActionDrafts } : {}),
              ...(streamCarousel.length ? { carousel: streamCarousel } : {}),
              ...(streamSuggestions.length ? { suggestions: streamSuggestions } : {}),
            },
          };
          try {
            await insertChatMessage(sessionId, payload);
            setSaveState("saved");
          } catch (persistError) {
            console.warn("[use-ai-chat] assistant message persist failed", persistError);
            failedPersistRef.current = { sessionId, payload };
            setSaveState("error");
          }
        }
        setStreamStatus(null);
        void refreshSessions();
      } catch (requestError) {
        if (requestError instanceof DOMException && requestError.name === "AbortError") return;
        if (activeAssistantMessageId) {
          const assistantMessageId = activeAssistantMessageId;
          const partialContent = streamedContentRef.current.get(assistantMessageId)?.trim() ?? "";
          pendingAssistantMessagesRef.current.delete(assistantMessageId);
          streamedContentRef.current.delete(assistantMessageId);
          setMessages((current) =>
            partialContent
              ? current.map((entry) =>
                  entry.id === assistantMessageId
                    ? { ...entry, content: `${partialContent}\n\n[Interrupted]`, isComplete: true }
                    : entry,
                )
              : current.filter((entry) => entry.id !== assistantMessageId),
          );
        }
        setError(
          requestError instanceof Error
            ? requestError.message
            : "Prometheus could not generate a response.",
        );
      } finally {
        if (renderFrame !== null) {
          window.cancelAnimationFrame(renderFrame);
          renderFrame = null;
        }
        if (abortControllerRef.current === controller) {
          abortControllerRef.current = null;
          setIsSending(false);
          setIsAwaitingResponse(false);
          setStreamStatus(null);
        }
      }
    },
    [draft, ensureSession, isHistoryLoading, isSending, projectId, refreshSessions],
  );

  const completeAssistantMessage = useCallback((messageId: string) => {
    const pending = pendingAssistantMessagesRef.current.get(messageId);
    pendingAssistantMessagesRef.current.delete(messageId);
    streamedContentRef.current.delete(messageId);
    setMessages((current) => current.map((message) => message.id === messageId ? { ...message, isComplete: true } : message));
    setIsSending(false);
    setIsAwaitingResponse(false);

    if (pending?.sessionId) {
      void insertChatMessage(pending.sessionId, {
        role: "assistant",
        content: pending.message.content,
        platform: pending.message.platform,
        post_type: pending.message.postType,
      }).then(() => refreshSessions()).catch(() => undefined);
    }
  }, [refreshSessions]);

  const reportStreamingProgress = useCallback((messageId: string, content: string) => {
    streamedContentRef.current.set(messageId, content);
  }, []);

  const stopStreaming = useCallback(() => {
    abortControllerRef.current?.abort();
    const pendingMessages = [...pendingAssistantMessagesRef.current.values()];
    pendingAssistantMessagesRef.current.clear();
    setMessages((current) => current.map((message) => {
      if (message.isComplete !== false) return message;
      const content = streamedContentRef.current.get(message.id) ?? message.content;
      return { ...message, content: `${content}\n\n[Stopped]`, isComplete: true };
    }));
    setIsSending(false);
    setIsAwaitingResponse(false);

    for (const pending of pendingMessages) {
      if (!pending.sessionId) continue;
      const content = streamedContentRef.current.get(pending.message.id) ?? pending.message.content;
      streamedContentRef.current.delete(pending.message.id);
      void insertChatMessage(pending.sessionId, {
        role: "assistant",
        content: `${content}\n\n[Stopped]`,
        platform: pending.message.platform,
        post_type: pending.message.postType,
      }).then(() => refreshSessions()).catch(() => undefined);
    }
  }, [refreshSessions]);

  const editAndResendMessage = useCallback(async (messageId: string, content: string) => {
    if (isSending) return;
    const source = messagesRef.current;
    const messageIndex = source.findIndex((message) => message.id === messageId && message.role === "user");
    if (messageIndex < 0) return;

    const editedMessage = { ...source[messageIndex], content, isComplete: true };
    const retainedMessages = [...source.slice(0, messageIndex), editedMessage];
    setMessages(retainedMessages);

    const sessionId = currentSessionIdRef.current;
    if (sessionId) {
      try {
        await deleteChatMessages(sessionId);
        await insertChatMessages(sessionId, retainedMessages.map((message) => ({ role: message.role, content: message.content, platform: message.platform, post_type: message.postType })));
        await refreshSessions();
      } catch {
        setError("Unable to update this chat right now.");
        return;
      }
    }

    await sendMessage(content, {
      history: retainedMessages.slice(0, -1),
      persistUser: false,
      reuseMessage: editedMessage,
    });
  }, [isSending, refreshSessions, sendMessage]);

  const selectSession = useCallback((sessionId: string) => {
    abortControllerRef.current?.abort();
    pendingAssistantMessagesRef.current.clear();
    memorySessionIdRef.current = null;
    setIsSending(false);
    setIsAwaitingResponse(false);
    // Do not clear the thread here: loadSessionMessages only swaps messages after
    // a successful fetch, so a failed load leaves the previous thread visible
    // and surfaces historyLoadError instead of a silent empty chat.
    setHistoryLoadError(null);
    if (sessionId === currentSessionIdRef.current) {
      // Re-selecting the active session does not change currentSessionId, so the load
      // effect never refires; reload explicitly or the thread stays empty until remount.
      void loadSessionMessages(sessionId);
      return;
    }
    setActiveSessionId(sessionId);
  }, [loadSessionMessages, setActiveSessionId]);

  const retryLoadSession = useCallback(() => {
    const sessionId = lastLoadAttemptRef.current;
    if (!sessionId) return;
    setHistoryLoadError(null);
    void loadSessionMessages(sessionId);
  }, [loadSessionMessages]);

  const createNewSession = useCallback(async () => {
    setIsHistoryLoading(true);
    try {
      const session = await createChatSession(projectId);
      setActiveSessionId(session.id);
      setSessions((current) => [session, ...current.filter((entry) => entry.id !== session.id)]);
      messagesRef.current = [];
      memorySessionIdRef.current = session.id;
      setMessages([]);
      return session;
    } catch {
      setError("Unable to create a saved chat right now.");
      return null;
    } finally {
      setIsHistoryLoading(false);
    }
  }, [projectId, setActiveSessionId]);

  const removeSession = useCallback(async (sessionId: string) => {
    setIsHistoryLoading(true);
    try {
      await deleteChatSession(sessionId);
      const remaining = sessions.filter((session) => session.id !== sessionId);
      setSessions(remaining);
      if (currentSessionId !== sessionId) return;
      const nextSession = remaining[0];
      if (nextSession) {
        selectSession(nextSession.id);
      } else {
        await createNewSession();
      }
    } catch {
      setError("Unable to delete this chat right now.");
    } finally {
      setIsHistoryLoading(false);
    }
  }, [createNewSession, currentSessionId, selectSession, sessions]);

  const renameSession = useCallback(async (sessionId: string, title: string) => {
    try {
      const session = await updateChatSessionTitle(sessionId, title);
      setSessions((current) => current.map((entry) => entry.id === sessionId ? session : entry));
    } catch {
      setError("Unable to rename this chat right now.");
    }
  }, []);

  const retryPersist = useCallback(async () => {
    const failed = failedPersistRef.current;
    if (!failed) return;
    setSaveState("saving");
    try {
      await insertChatMessage(failed.sessionId, failed.payload);
      failedPersistRef.current = null;
      setSaveState("saved");
      void refreshSessions();
    } catch (persistError) {
      console.warn("[use-ai-chat] retry persist failed", persistError);
      setSaveState("error");
    }
  }, [refreshSessions]);

  const clearError = useCallback(() => setError(null), []);

  return {
    clearError,
    draft,
    error,
    completeAssistantMessage,
    editAndResendMessage,
    createNewSession,
    currentSessionId,
    historyLoadError,
    isAwaitingResponse,
    isHistoryLoading,
    isSending,
    messages,
    removeSession,
    renameSession,
    reportStreamingProgress,
    retryLoadSession,
    retryPersist,
    saveState,
    sendMessage,
    stopStreaming,
    selectSession,
    setDraft,
    sessions,
    streamActivity,
    streamStatus,
  };
}

// Retained during the transition from word-based reveal to AIChatStreamingText.
// New responses use the component-driven animation above.
async function streamAssistantResponse(
  message: AIChatMessage,
  setMessages: Dispatch<SetStateAction<AIChatMessage[]>>,
) {
  const chunks = message.content.match(/\S+\s*/g) ?? [message.content];

  setMessages((current) => [...current, { ...message, content: "" }]);

  for (let index = 0; index < chunks.length; index += 1) {
    const content = chunks.slice(0, index + 1).join("");
    setMessages((current) =>
      current.map((entry) =>
        entry.id === message.id ? { ...entry, content } : entry,
      ),
    );

    if (index < chunks.length - 1) {
      await new Promise<void>((resolve) => window.setTimeout(resolve, 16));
    }
  }
}

function normalizeFrameReferenceList(input: unknown, max = 8): AIChatFrameReference[] {
  if (!Array.isArray(input)) return [];
  const frames: AIChatFrameReference[] = [];
  for (const value of input) {
    if (!value || typeof value !== "object" || Array.isArray(value)) continue;
    const record = value as Record<string, unknown>;
    frames.push({
      id: typeof record.id === "string" && record.id ? record.id : `frame-${frames.length}`,
      label:
        typeof record.label === "string" && record.label.trim()
          ? record.label.trim()
          : "Frame reference",
      timecode: typeof record.timecode === "string" ? record.timecode : "",
      seconds:
        typeof record.seconds === "number" && Number.isFinite(record.seconds)
          ? record.seconds
          : undefined,
      thumbnailUrl:
        typeof record.thumbnailUrl === "string" && record.thumbnailUrl.trim()
          ? record.thumbnailUrl.trim()
          : null,
      reason: typeof record.reason === "string" ? record.reason : "",
    });
    if (frames.length >= max) break;
  }
  return frames;
}

function normalizeCarouselItems(input: unknown, max = 8): CarouselItem[] {
  if (!Array.isArray(input)) return [];
  const items: CarouselItem[] = [];
  const validKinds = new Set<CarouselItemKind>([
    "action",
    "style",
    "asset",
    "music",
    "font",
    "template",
  ]);
  for (const value of input) {
    if (!value || typeof value !== "object" || Array.isArray(value)) continue;
    const record = value as Record<string, unknown>;
    const title = typeof record.title === "string" ? record.title.trim() : "";
    if (!title) continue;

    const rawKind = typeof record.kind === "string" ? record.kind.trim() : "";
    const kind = validKinds.has(rawKind as CarouselItemKind)
      ? (rawKind as CarouselItemKind)
      : "action";
    const rawPayload =
      record.payload && typeof record.payload === "object" && !Array.isArray(record.payload)
        ? (record.payload as Record<string, unknown>)
        : {};
    const legacyMessage = typeof record.message === "string" ? record.message.trim() : "";
    const message =
      typeof rawPayload.message === "string" && rawPayload.message.trim()
        ? rawPayload.message.trim()
        : legacyMessage || undefined;
    const tool =
      typeof rawPayload.tool === "string" && rawPayload.tool.trim()
        ? rawPayload.tool.trim()
        : undefined;
    const args =
      rawPayload.args && typeof rawPayload.args === "object" && !Array.isArray(rawPayload.args)
        ? (rawPayload.args as Record<string, unknown>)
        : undefined;
    const payload = message || tool || args ? { message, tool, args } : undefined;

    items.push({
      id:
        typeof record.id === "string" && record.id.trim()
          ? record.id.trim()
          : `carousel-${items.length}`,
      kind,
      title,
      subtitle:
        typeof record.subtitle === "string" && record.subtitle.trim()
          ? record.subtitle.trim()
          : typeof record.description === "string" && record.description.trim()
            ? record.description.trim()
            : undefined,
      image:
        typeof record.image === "string" && record.image.trim()
          ? record.image.trim()
          : undefined,
      badge:
        typeof record.badge === "string" && record.badge.trim()
          ? record.badge.trim()
          : undefined,
      payload,
    });
    if (items.length >= max) break;
  }
  return items.length < 3 ? [] : items;
}

function normalizeSuggestionList(input: unknown, max = 4): string[] {
  if (!Array.isArray(input)) return [];
  const suggestions: string[] = [];
  for (const value of input) {
    if (typeof value !== "string") continue;
    const trimmed = value.trim();
    if (!trimmed) continue;
    suggestions.push(trimmed);
    if (suggestions.length >= max) break;
  }
  return suggestions;
}

function normalizePersistedMessageMetadata(
  input: unknown,
): Pick<AIChatMessage, "frames" | "toolCalls" | "actionDrafts" | "carousel" | "suggestions" | "media" | "jobs"> {
  if (!input || typeof input !== "object" || Array.isArray(input)) return {};
  const metadata = input as Record<string, unknown>;
  const frames = normalizeFrameReferenceList(metadata.frames);
  const toolCalls = Array.isArray(metadata.toolCalls) ? metadata.toolCalls : [];
  const actionDrafts = parseEditorActionDrafts(metadata.actionDrafts);
  const carousel = normalizeCarouselItems(metadata.carousel);
  const suggestions = normalizeSuggestionList(metadata.suggestions);
  const media = normalizeChatMedia(metadata.media);
  const jobs = normalizeChatJobs(metadata.jobs ?? metadata.mediaJobs);

  return {
    ...(frames.length ? { frames } : {}),
    ...(toolCalls.length ? { toolCalls } : {}),
    ...(actionDrafts.length ? { actionDrafts } : {}),
    ...(carousel.length ? { carousel } : {}),
    ...(suggestions.length ? { suggestions } : {}),
    ...(media.length ? { media } : {}),
    ...(jobs.length ? { jobs } : {}),
  };
}

function inferPostMetadata(value: string): Pick<AIChatMessage, "platform" | "postType"> {
  const content = value.toLowerCase();
  const platform = content.includes("instagram")
    ? "instagram"
    : content.includes("linkedin")
      ? "linkedin"
      : content.includes("tiktok")
        ? "tiktok"
        : content.includes("youtube")
          ? "youtube"
          : content.includes("twitter") || content.includes("x thread")
            ? "twitter"
            : undefined;
  const postType = content.includes("calendar")
    ? "calendar"
    : content.includes("thread")
      ? "thread"
      : content.includes("script")
        ? "script"
        : content.includes("description")
          ? "description"
          : platform === "instagram"
            ? "caption"
            : undefined;

  return { platform, postType };
}
