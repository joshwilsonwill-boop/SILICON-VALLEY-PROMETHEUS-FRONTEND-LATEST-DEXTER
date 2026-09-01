"use client";

import React, { useEffect, useRef, memo, useDeferredValue } from "react";
import ReactMarkdown from "react-markdown";
import type { Components } from "react-markdown";
import remarkGfm from "remark-gfm";

const REMARK_PLUGINS = [remarkGfm];

const MARKDOWN_COMPONENTS: Components = {
  h1: ({ children }) => <h1 className="mb-3 mt-5 text-lg font-semibold text-white first:mt-0">{children}</h1>,
  h2: ({ children }) => <h2 className="mb-2.5 mt-5 text-base font-semibold text-white first:mt-0">{children}</h2>,
  h3: ({ children }) => <h3 className="mb-2 mt-4 text-[15px] font-semibold text-white first:mt-0">{children}</h3>,
  p: ({ children }) => <p className="my-2 first:mt-0 last:mb-0">{children}</p>,
  ul: ({ children }) => <ul className="my-3 list-disc space-y-1.5 pl-5">{children}</ul>,
  ol: ({ children }) => <ol className="my-3 list-decimal space-y-1.5 pl-5">{children}</ol>,
  blockquote: ({ children }) => <blockquote className="my-3 border-l-2 border-white/20 pl-3 text-white/62">{children}</blockquote>,
  table: ({ children }) => <table className="my-4 w-full min-w-[34rem] border-collapse text-left text-[13px] leading-5">{children}</table>,
  thead: ({ children }) => <thead className="border-b border-white/18 text-white/82">{children}</thead>,
  tbody: ({ children }) => <tbody className="divide-y divide-white/[0.07]">{children}</tbody>,
  th: ({ children }) => <th className="bg-white/[0.05] px-3 py-2 font-semibold align-top">{children}</th>,
  td: ({ children }) => <td className="px-3 py-2.5 align-top text-white/68">{children}</td>,
  code: ({ children, className }) => className
    ? <code className="my-3 block overflow-x-auto rounded-md border border-white/8 bg-white/[0.035] p-3 font-mono text-xs">{children}</code>
    : <code className="rounded bg-white/10 px-1 py-0.5 font-mono text-[0.88em]">{children}</code>,
  a: ({ children, href }) => <a href={href} target="_blank" rel="noreferrer" className="text-[#b9fff0] underline decoration-white/25 underline-offset-2 hover:decoration-[#b9fff0]">{children}</a>,
};

export const PrometheusChatMarkdown = memo(function PrometheusChatMarkdown({
  content,
  isComplete,
  onComplete,
  onProgress,
}: {
  content: string;
  isComplete: boolean;
  onComplete?: () => void;
  onProgress?: () => void;
}) {
  const completionNotifiedRef = useRef(false);
  // Defer markdown rendering during streaming to guarantee zero input lag for user typing
  const deferredContent = useDeferredValue(content);
  const displayContent = isComplete ? content : deferredContent;

  useEffect(() => {
    if (!isComplete) {
      completionNotifiedRef.current = false;
      onProgress?.();
      return;
    }

    if (!completionNotifiedRef.current) {
      completionNotifiedRef.current = true;
      onComplete?.();
    }
  }, [content, isComplete, onComplete, onProgress]);

  return (
    <div className="min-w-0 max-w-full overflow-x-auto [overflow-wrap:anywhere]">
      <ReactMarkdown
        remarkPlugins={REMARK_PLUGINS}
        components={MARKDOWN_COMPONENTS}
      >
        {displayContent}
      </ReactMarkdown>
      {!isComplete ? <span className="ai-chat-streaming-cursor text-white/60" aria-label="Streaming response">|</span> : null}
    </div>
  );
});
