import "server-only";

import { loadProjectChatContext } from "@/lib/prometheus-assistant/project-context";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const projectId = url.searchParams.get("projectId")?.trim();
  const playhead = Number(url.searchParams.get("playheadSec"));

  if (!projectId || projectId === "__new__") {
    return Response.json({ video: null, status: "no-project" });
  }

  try {
    const context = await loadProjectChatContext(projectId, {
      playheadSec: Number.isFinite(playhead) ? playhead : null,
    });
    if (!context) {
      return Response.json({ video: null, status: "no-context" });
    }
    return Response.json({
      video: context.video,
      transcriptAvailable: Boolean(context.transcript?.text),
      editorialAnalysis: context.editorialAnalysis,
      ingestionStatus: context.ingestionStatus,
      status: context.video ? "video" : "no-video",
    });
  } catch (error) {
    console.error("[prometheus-chat/video-context] failed", error);
    return Response.json({ video: null, status: "error" }, { status: 200 });
  }
}
