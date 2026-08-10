export type ChatMediaKind = "image" | "video" | "recommendation" | "frame";

export type ChatMediaItem = {
  id: string;
  kind: ChatMediaKind;
  url: string;
  thumbnailUrl?: string;
  title?: string;
  description?: string;
  seconds?: number;
  selectable?: boolean;
};

export type ChatJobState = "queued" | "working" | "complete" | "retryable_error";

export type ChatMediaJob = {
  id: string;
  label: string;
  state: ChatJobState;
  progress?: number;
  error?: string;
  retryable?: boolean;
  statusUrl?: string;
  result?: ChatMediaItem[];
};

const text = (value: unknown) => typeof value === "string" && value.trim() ? value.trim() : undefined;
const number = (value: unknown) => typeof value === "number" && Number.isFinite(value) ? value : undefined;

export function normalizeChatMedia(input: unknown): ChatMediaItem[] {
  if (!Array.isArray(input)) return [];
  return input.flatMap((value, index) => {
    if (!value || typeof value !== "object") return [];
    const item = value as Record<string, unknown>;
    const kind = item.kind;
    const url = text(item.url) ?? text(item.src);
    if (!url || !["image", "video", "recommendation", "frame"].includes(String(kind))) return [];
    return [{
      id: text(item.id) ?? `media-${index}`,
      kind: kind as ChatMediaKind,
      url,
      thumbnailUrl: text(item.thumbnailUrl) ?? text(item.poster),
      title: text(item.title),
      description: text(item.description),
      seconds: number(item.seconds),
      selectable: item.selectable === true || kind === "frame",
    }];
  });
}

export function normalizeChatJob(input: unknown): ChatMediaJob | null {
  if (!input || typeof input !== "object") return null;
  const value = input as Record<string, unknown>;
  const id = text(value.id) ?? text(value.jobId);
  if (!id) return null;
  const rawStatus = String(value.state ?? value.status ?? "queued").toLowerCase();
  const state: ChatJobState = ["complete", "completed", "succeeded", "success"].includes(rawStatus)
    ? "complete"
    : ["failed", "error", "retryable_error"].includes(rawStatus)
      ? "retryable_error"
      : ["working", "processing", "running", "in_progress"].includes(rawStatus)
        ? "working"
        : "queued";
  const rawResult = value.result && typeof value.result === "object" ? value.result as Record<string, unknown> : {};
  return {
    id,
    label: text(value.label) ?? text(value.type) ?? "Media edit",
    state,
    progress: number(value.progress),
    error: text(value.error) ?? text(value.message),
    retryable: value.retryable !== false,
    statusUrl: text(value.statusUrl) ?? `/api/jobs/${encodeURIComponent(id)}/status`,
    result: normalizeChatMedia(value.media ?? rawResult.media ?? rawResult.outputs ?? rawResult.assets),
  };
}

export function normalizeChatJobs(input: unknown): ChatMediaJob[] {
  if (!Array.isArray(input)) return [];
  return input.map(normalizeChatJob).filter((job): job is ChatMediaJob => Boolean(job));
}
