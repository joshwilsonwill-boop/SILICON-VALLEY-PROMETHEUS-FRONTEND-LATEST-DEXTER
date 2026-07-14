"use client";

import { useCallback, useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";

import { getChatMessages, insertChatMessage } from "@/lib/supabase/chat-messages";
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

export type AIChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
  isComplete?: boolean;
  platform?: AIChatPlatform;
  postType?: AIChatPostType;
};

type PrometheusChatResponse = {
  error?: string;
  reply?: string;
};

const SOCIAL_STRATEGIST_CONTEXT =
  "Act as a social media content strategist for video creators. Tailor posts, hooks, calls to action, and hashtags to the requested platform.";

export function useAIChat({ projectId, enabled = true }: { projectId: string | null; enabled?: boolean }) {
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState<AIChatMessage[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [isAwaitingResponse, setIsAwaitingResponse] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const currentSessionIdRef = useRef<string | null>(null);
  const creatingSessionRef = useRef<Promise<ChatSession> | null>(null);
  const pendingAssistantMessagesRef = useRef(new Map<string, { message: AIChatMessage; sessionId: string | null }>());

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
        } else {
          await ensureSession();
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

  useEffect(() => {
    if (!enabled || !currentSessionId) return;
    const sessionId = currentSessionId;
    let disposed = false;

    async function loadMessages() {
      setIsHistoryLoading(true);
      setMessages([]);
      try {
        const records = await getChatMessages(sessionId);
        if (disposed) return;
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
      } catch {
        // A failed history load must not discard the existing send-message flow.
      } finally {
        if (!disposed) setIsHistoryLoading(false);
      }
    }

    void loadMessages();
    return () => {
      disposed = true;
    };
  }, [currentSessionId, enabled]);

  useEffect(() => {
    if (!enabled || !currentSessionId) return;
    const url = new URL(window.location.href);
    if (url.searchParams.get("chat_session") === currentSessionId) return;
    url.searchParams.set("chat_session", currentSessionId);
    window.history.replaceState({}, "", url);
  }, [currentSessionId, enabled]);

  const sendMessage = useCallback(
    async (message?: string) => {
      const text = (message ?? draft).trim();
      if (!text || isSending) return;

      const userMessage: AIChatMessage = {
        id: `user-${crypto.randomUUID()}`,
        role: "user",
        content: text,
        createdAt: new Date().toISOString(),
        isComplete: true,
      };
      const history = messages.map(({ role, content }) => ({ role, content }));

      setMessages((current) => [...current, userMessage]);
      setDraft("");
      setError(null);
      setIsSending(true);
      setIsAwaitingResponse(true);

      abortControllerRef.current?.abort();
      const controller = new AbortController();
      abortControllerRef.current = controller;
      let awaitStreamingCompletion = false;

      try {
        const sessionId = await ensureSession().catch(() => null);
        if (sessionId) {
          void insertChatMessage(sessionId, {
            role: "user",
            content: text,
            ...inferPostMetadata(text),
          }).then(() => refreshSessions()).catch(() => undefined);
        }

        const response = await fetch("/api/prometheus-chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: text,
            messages: history,
            originalPrompt: SOCIAL_STRATEGIST_CONTEXT,
            projectId,
            verbosity: "normal",
          }),
          signal: controller.signal,
        });
        const payload = (await response.json().catch(() => null)) as PrometheusChatResponse | null;

        const reply = payload?.reply;
        if (!response.ok || !reply) {
          throw new Error(payload?.error || "Prometheus could not generate a response.");
        }

        const assistantMessage: AIChatMessage = {
          id: `assistant-${crypto.randomUUID()}`,
          role: "assistant",
          content: reply,
          createdAt: new Date().toISOString(),
          isComplete: false,
          ...inferPostMetadata(`${text}\n${reply}`),
        };
        pendingAssistantMessagesRef.current.set(assistantMessage.id, { message: assistantMessage, sessionId });
        setMessages((current) => [...current, assistantMessage]);
        awaitStreamingCompletion = true;
        setIsAwaitingResponse(false);
      } catch (requestError) {
        if (requestError instanceof DOMException && requestError.name === "AbortError") return;
        setError(
          requestError instanceof Error
            ? requestError.message
            : "Prometheus could not generate a response.",
        );
      } finally {
        if (abortControllerRef.current === controller) {
          abortControllerRef.current = null;
          if (!awaitStreamingCompletion) setIsSending(false);
          setIsAwaitingResponse(false);
        }
      }
    },
    [draft, ensureSession, isSending, messages, projectId, refreshSessions],
  );

  const completeAssistantMessage = useCallback((messageId: string) => {
    const pending = pendingAssistantMessagesRef.current.get(messageId);
    pendingAssistantMessagesRef.current.delete(messageId);
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

  const selectSession = useCallback((sessionId: string) => {
    abortControllerRef.current?.abort();
    pendingAssistantMessagesRef.current.clear();
    setIsSending(false);
    setIsAwaitingResponse(false);
    setMessages([]);
    setActiveSessionId(sessionId);
  }, [setActiveSessionId]);

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

  const clearError = useCallback(() => setError(null), []);

  return {
    clearError,
    draft,
    error,
    completeAssistantMessage,
    createNewSession,
    currentSessionId,
    isAwaitingResponse,
    isHistoryLoading,
    isSending,
    messages,
    removeSession,
    renameSession,
    sendMessage,
    selectSession,
    setDraft,
    sessions,
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
