export type PrometheusChatStreamEvent =
  | { type: "status"; message: string }
  | { type: "delta"; content: string }
  | {
      type: "metadata";
      sources?: unknown[];
      frames?: unknown[];
      toolCalls?: unknown[];
    }
  | { type: "done"; persisted: boolean }
  | { type: "error"; message: string };

export function encodePrometheusChatStreamEvent(
  event: PrometheusChatStreamEvent,
) {
  return `${JSON.stringify(event)}\n`;
}

export class PrometheusChatStreamDecoder {
  private buffered = "";

  push(chunk: string) {
    this.buffered += chunk;
    const lines = this.buffered.split("\n");
    this.buffered = lines.pop() ?? "";
    return lines.flatMap(parsePrometheusChatStreamLine);
  }

  flush() {
    const trailing = this.buffered;
    this.buffered = "";
    return trailing ? parsePrometheusChatStreamLine(trailing) : [];
  }
}

function parsePrometheusChatStreamLine(
  line: string,
): PrometheusChatStreamEvent[] {
  const normalized = line.trim();
  if (!normalized) return [];

  try {
    const value = JSON.parse(normalized) as Record<string, unknown>;
    if (value.type === "status" && typeof value.message === "string") {
      return [{ type: "status", message: value.message }];
    }
    if (value.type === "delta" && typeof value.content === "string") {
      return [{ type: "delta", content: value.content }];
    }
    if (value.type === "metadata") {
      return [
        {
          type: "metadata",
          sources: Array.isArray(value.sources) ? value.sources : undefined,
          frames: Array.isArray(value.frames) ? value.frames : undefined,
          toolCalls: Array.isArray(value.toolCalls)
            ? value.toolCalls
            : undefined,
        },
      ];
    }
    if (value.type === "done" && typeof value.persisted === "boolean") {
      return [{ type: "done", persisted: value.persisted }];
    }
    if (value.type === "error" && typeof value.message === "string") {
      return [{ type: "error", message: value.message }];
    }
  } catch {
    return [];
  }

  return [];
}
