"use client";

import { Check, Copy, Pencil } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

export function ChatMessageBubble({
  content,
  isStreaming = false,
  onCopy,
  onEdit,
  onStreamingProgress,
  onStreamingComplete,
  role,
}: {
  content: string;
  isStreaming?: boolean;
  onCopy: () => void;
  onEdit?: (content: string) => void;
  onStreamingProgress?: (content: string) => void;
  onStreamingComplete?: () => void;
  role: "user" | "assistant";
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(content);
  const streamingCompleteRef = useRef(false);

  useEffect(() => setEditValue(content), [content]);

  useEffect(() => {
    if (!isStreaming) {
      if (!streamingCompleteRef.current) {
        streamingCompleteRef.current = true;
        onStreamingComplete?.();
      }
      return;
    }

    streamingCompleteRef.current = false;
    onStreamingProgress?.(content);
  }, [content, isStreaming, onStreamingComplete, onStreamingProgress]);

  const renderedContent = content;

  const saveEdit = () => {
    const nextContent = editValue.trim();
    if (nextContent && nextContent !== content) onEdit?.(nextContent);
    setIsEditing(false);
  };

  return (
    <div className={cn("group relative rounded-2xl px-4 py-3 text-sm leading-relaxed", role === "user" ? "rounded-br-md bg-white/[0.09] text-white" : "rounded-bl-md bg-white/[0.04] text-white/90")}>
      <div className="absolute right-2 top-2 flex gap-1 opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100">
        <button type="button" onClick={onCopy} className="grid size-6 place-items-center rounded-md text-white/45 hover:bg-white/[0.08] hover:text-white" aria-label="Copy message"><Copy className="size-3.5" /></button>
        {role === "user" && onEdit ? <button type="button" onClick={() => isEditing ? saveEdit() : setIsEditing(true)} className="grid size-6 place-items-center rounded-md text-white/45 hover:bg-white/[0.08] hover:text-white" aria-label={isEditing ? "Save edit" : "Edit message"}>{isEditing ? <Check className="size-3.5" /> : <Pencil className="size-3.5" />}</button> : null}
      </div>
      {role === "assistant" ? (
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            h1: ({ children }) => <h1 className="my-3 text-xl font-bold first:mt-0">{children}</h1>,
            h2: ({ children }) => <h2 className="my-3 text-lg font-semibold first:mt-0">{children}</h2>,
            h3: ({ children }) => <h3 className="my-2 text-base font-semibold first:mt-0">{children}</h3>,
            p: ({ children }) => <p className="my-2 first:mt-0 last:mb-0">{children}</p>,
            ul: ({ children }) => <ul className="my-2 list-disc space-y-1 pl-5">{children}</ul>,
            ol: ({ children }) => <ol className="my-2 list-decimal space-y-1 pl-5">{children}</ol>,
            code: ({ children, className }) => className ? <code className="block overflow-x-auto rounded-lg bg-black/30 p-3 text-xs">{children}</code> : <code className="rounded bg-white/10 px-1 py-0.5 text-xs">{children}</code>,
            blockquote: ({ children }) => <blockquote className="my-2 border-l-2 border-white/30 pl-3 text-white/65">{children}</blockquote>,
          }}
        >
          {renderedContent}
        </ReactMarkdown>
      ) : isEditing ? (
        <textarea value={editValue} onChange={(event) => setEditValue(event.target.value)} onKeyDown={(event) => { if (event.key === "Escape") setIsEditing(false); if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); saveEdit(); } }} autoFocus className="min-h-16 w-full resize-none bg-transparent pr-8 text-sm outline-none" />
      ) : <p className="whitespace-pre-wrap">{content}</p>}
      {isStreaming ? <span className="ml-1 inline-block h-4 w-1 animate-pulse bg-white/60 align-middle" aria-label="Streaming response" /> : null}
    </div>
  );
}
