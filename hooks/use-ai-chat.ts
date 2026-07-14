"use client";

import { useCallback, useRef, useState, type Dispatch, type SetStateAction } from "react";

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
  platform?: AIChatPlatform;
  postType?: AIChatPostType;
};

type PrometheusChatResponse = {
  error?: string;
  reply?: string;
};

const SOCIAL_STRATEGIST_CONTEXT =
  "Act as a social media content strategist for video creators. Tailor posts, hooks, calls to action, and hashtags to the requested platform.";

export function useAIChat({ projectId }: { projectId: string | null }) {
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState<AIChatMessage[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const sendMessage = useCallback(
    async (message?: string) => {
      const text = (message ?? draft).trim();
      if (!text || isSending) return;

      const userMessage: AIChatMessage = {
        id: `user-${crypto.randomUUID()}`,
        role: "user",
        content: text,
        createdAt: new Date().toISOString(),
      };
      const history = messages.map(({ role, content }) => ({ role, content }));

      setMessages((current) => [...current, userMessage]);
      setDraft("");
      setError(null);
      setIsSending(true);

      abortControllerRef.current?.abort();
      const controller = new AbortController();
      abortControllerRef.current = controller;

      try {
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

        await streamAssistantResponse(
          {
            id: `assistant-${crypto.randomUUID()}`,
            role: "assistant",
            content: reply,
            createdAt: new Date().toISOString(),
            ...inferPostMetadata(`${text}\n${reply}`),
          },
          setMessages,
        );
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
          setIsSending(false);
        }
      }
    },
    [draft, isSending, messages, projectId],
  );

  const clearError = useCallback(() => setError(null), []);

  return {
    clearError,
    draft,
    error,
    isSending,
    messages,
    sendMessage,
    setDraft,
  };
}

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
