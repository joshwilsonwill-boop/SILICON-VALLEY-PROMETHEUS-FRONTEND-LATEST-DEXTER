"use client";

import { useCallback, useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";

import { parseEditorActionDrafts, type EditorActionDraft } from "@/lib/editor-actions";
import { classifyPrometheusChatIntent } from "@/lib/prometheus-assistant/chat-intent";
import { consumePrometheusChatStream } from "@/lib/prometheus-assistant/chat-stream-client";
import type { PrometheusChatStreamEvent } from "@/lib/prometheus-assistant/chat-stream";
import type { ChatEditorContext, ChatFrameThumb } from "@/lib/prometheus-assistant/editor-context";
import { deleteChatMessages, getChatMessages, insertChatMessage, insertChatMessages, type ChatMessageInsert } from "@/lib/supabase/chat-messages";
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
  const [streamStatus, setStreamStatus] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const messagesRef = useRef<AIChatMessage[]>([]);
  const abortControllerRef = useRef<AbortController | null>(null);
  const currentSessionIdRef = useRef<string | null>(null);
  const creatingSessionRef = useRef<Promise<ChatSession> | null>(null);
  const pendingAssistantMessagesRef = useRef(new Map<string, { message: AIChatMessage; sessionId: string | null }>());
  const streamedContentRef = useRef(new Map<string, string>());
  const contextProviderRef = useRef<AIChatContextProvider | undefined>(contextProvider);
  const failedPersistRef = useRef<{ sessionId: string; payload: ChatMessageInsert } | null>(null);

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
    setIsHistoryLoading(true);
    setMessages([]);
    try {
      const records = await getChatMessages(sessionId);
      if (isDisposed?.()) return;
      setMessages(
        records
          .filter((record) => record.role === "user" || record.role === "assistant")
          .map((record) => ({
            id: record.id,
            role: record.role === "assistant" ? "assistant" : "user",
            content: record.content,
            createdAt: record.created_at,
            isComplete: true,
            platform: record.platform as AIChatPlatform | undefined,
            postType: record.post_type as AIChatPostType | undefined,
          })),
      );
    } catch (err) {
      // A failed history load must not discard the existing send-message flow.
      console.warn("[use-ai-chat] history load failed", err);
    } finally {
      if (!isDisposed?.()) setIsHistoryLoading(false);
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
      if (!text || isSending) return;

      const userMessage = options?.reuseMessage ?? {
        id: `user-${crypto.randomUUID()}`,
        role: "user",
        content: text,
        createdAt: new Date().toISOString(),
        isComplete: true,
      } satisfies AIChatMessage;
      const history = (options?.history ?? messagesRef.current).map(({ role, content }) => ({ role, content }));

      if (!options?.reuseMessage) setMessages((current) => [...current, userMessage]);
      setDraft("");
      setError(null);
      setIsSending(true);
      setIsAwaitingResponse(true);
      setStreamStatus("Preparing response");

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
    [draft, ensureSession, isSending, projectId, refreshSessions],
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
    setIsSending(false);
    setIsAwaitingResponse(false);
    setMessages([]);
    if (sessionId === currentSessionIdRef.current) {
      // Re-selecting the active session does not change currentSessionId, so the load
      // effect never refires; reload explicitly or the thread stays empty until remount.
      void loadSessionMessages(sessionId);
      return;
    }
    setActiveSessionId(sessionId);
  }, [loadSessionMessages, setActiveSessionId]);

  const createNewSession = useCallback(async () => {
    setIsHistoryLoading(true);
    try {
      const session = await createChatSession(projectId);
      setActiveSessionId(session.id);
      setSessions((current) => [session, ...current.filter((entry) => entry.id !== session.id)]);
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
    isAwaitingResponse,
    isHistoryLoading,
    isSending,
    messages,
    removeSession,
    renameSession,
    reportStreamingProgress,
    retryPersist,
    saveState,
    sendMessage,
    stopStreaming,
    selectSession,
    setDraft,
    sessions,
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
