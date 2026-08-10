"use client";

import { Check, ChevronDown, Clock3, LoaderCircle, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { normalizeChatJob, type ChatMediaItem, type ChatMediaJob } from "@/lib/prometheus-assistant/chat-media";
import { cn } from "@/lib/utils";

export function PrometheusChatMedia({
  media = [], jobs = [], onSelect,
}: {
  media?: ChatMediaItem[];
  jobs?: ChatMediaJob[];
  onSelect?: (item: ChatMediaItem) => void;
}) {
  const [jobState, setJobState] = useState(jobs);
  const [timelineOpen, setTimelineOpen] = useState(false);
  useEffect(() => setJobState(jobs), [jobs]);

  const poll = useCallback(async (job: ChatMediaJob) => {
    if (!job.statusUrl) return;
    try {
      const response = await fetch(job.statusUrl, { headers: { Accept: "application/json" }, cache: "no-store" });
      const body = response.status === 304 ? null : await response.json().catch(() => null);
      if (!response.ok) throw Object.assign(new Error(body?.error || "Unable to read job status"), { retryable: body?.retryable });
      const next = normalizeChatJob({ ...body, id: body?.id ?? job.id, label: job.label, statusUrl: job.statusUrl });
      if (next) setJobState((current) => current.map((item) => item.id === job.id ? next : item));
    } catch (error) {
      setJobState((current) => current.map((item) => item.id === job.id ? {
        ...item, state: "retryable_error", retryable: (error as { retryable?: boolean }).retryable !== false,
        error: error instanceof Error ? error.message : "Status update failed",
      } : item));
    }
  }, []);

  useEffect(() => {
    const pending = jobState.filter((job) => job.state === "queued" || job.state === "working");
    if (!pending.length) return;
    const timer = window.setTimeout(() => pending.forEach((job) => void poll(job)), 2000);
    return () => window.clearTimeout(timer);
  }, [jobState, poll]);

  const completedMedia = useMemo(() => [...media, ...jobState.flatMap((job) => job.result ?? [])], [jobState, media]);
  if (!completedMedia.length && !jobState.length) return null;

  return (
    <div className="flex w-full max-w-full flex-col gap-3">
      {jobState.length ? (
        <div className="rounded-xl border border-white/[0.08] bg-white/[0.025] px-3 py-2">
          <button type="button" onClick={() => setTimelineOpen((value) => !value)} aria-expanded={timelineOpen}
            className="flex w-full items-center gap-2 text-left text-[11px] uppercase tracking-[0.12em] text-white/45">
            <ChevronDown className={cn("size-3 transition-transform", timelineOpen && "rotate-180")} />
            Processing timeline
            <span className="ml-auto normal-case tracking-normal text-white/30">{jobState.at(-1)?.state.replace("_", " ")}</span>
          </button>
          {timelineOpen ? <ol className="mt-2 space-y-2 border-l border-white/10 pl-3">
            {jobState.map((job) => <li key={job.id} className="flex items-start gap-2 text-xs text-white/58">
              {job.state === "complete" ? <Check className="mt-0.5 size-3.5 text-emerald-300/75" /> : job.state === "working" ? <LoaderCircle className="mt-0.5 size-3.5 animate-spin" /> : <Clock3 className="mt-0.5 size-3.5" />}
              <span><span className="text-white/75">{job.label}</span>{typeof job.progress === "number" ? ` · ${Math.round(job.progress)}%` : ""}{job.error ? <span className="block text-red-300/70">{job.error}</span> : null}</span>
              {job.state === "retryable_error" && job.retryable !== false ? <button type="button" onClick={() => void poll(job)} className="ml-auto inline-flex items-center gap-1 text-white/55 hover:text-white"><RefreshCw className="size-3" /> Retry</button> : null}
            </li>)}
          </ol> : null}
        </div>
      ) : null}
      {completedMedia.length ? <ul className="grid max-w-full grid-cols-2 gap-2">
        {completedMedia.map((item) => <li key={item.id} className={cn("overflow-hidden rounded-xl border border-white/10 bg-white/[0.03]", item.kind === "recommendation" && "col-span-2 p-3")}>
          {item.kind === "video" ? <video src={item.url} poster={item.thumbnailUrl} controls playsInline preload="metadata" className="aspect-video w-full object-cover" /> : item.kind !== "recommendation" ? <img src={item.thumbnailUrl ?? item.url} alt={item.title ?? "Chat media"} loading="lazy" className="aspect-video w-full object-cover" /> : null}
          {(item.title || item.description) ? <div className="p-2"><p className="text-xs text-white/80">{item.title}</p><p className="mt-0.5 text-[11px] text-white/42">{item.description}</p></div> : null}
          {item.selectable ? <button type="button" onClick={() => onSelect?.(item)} className="m-2 mt-0 rounded-full border border-white/12 px-2.5 py-1 text-[11px] text-white/65 hover:text-white">Use for edit</button> : null}
        </li>)}
      </ul> : null}
    </div>
  );
}
