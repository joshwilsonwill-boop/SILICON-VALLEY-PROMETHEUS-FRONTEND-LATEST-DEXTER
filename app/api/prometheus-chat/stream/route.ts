import "server-only";

import Groq from "groq-sdk";

import {
  classifyPrometheusChatIntent,
  createDirectPrometheusReply,
  getPrometheusIntentInstruction,
} from "@/lib/prometheus-assistant/chat-intent";
import {
  encodePrometheusChatStreamEvent,
  type PrometheusChatStreamEvent,
} from "@/lib/prometheus-assistant/chat-stream";
import {
  formatSecondsAsTimecode,
  normalizeChatEditorContext,
  normalizeChatFrameThumbs,
  type ChatEditorContext,
} from "@/lib/prometheus-assistant/editor-context";
import {
  formatProjectContextForPrompt,
  loadProjectChatContext,
  type ProjectChatContext,
} from "@/lib/prometheus-assistant/project-context";
import {
  createExtractivePrometheusAnswer,
  formatKnowledgeContext,
  retrievePrometheusKnowledge,
  type PrometheusKnowledgeMatch,
} from "@/lib/prometheus-assistant/retrieval";
import { createLocalPrometheusFallback } from "@/lib/prometheus-assistant/local-chat-fallback";
import { buildChatFollowUpSuggestions } from "@/lib/prometheus-assistant/chat-follow-ups";
import {
  collectActionDrafts,
  executePrometheusTool,
  isToolUseFailed,
  normalizeGroqToolCalls,
  PROMETHEUS_TOOLS,
  toFramePayload,
  type ChatFrameReference,
  type PrometheusToolCall,
} from "@/lib/prometheus-assistant/tools";
import type { ChatMediaJob } from "@/lib/prometheus-assistant/chat-media";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const DEFAULT_GROQ_MODEL = "openai/gpt-oss-20b";
const MAX_COMPLETION_PASSES = 3;

type StreamRequest = {
  message?: unknown;
  messages?: unknown;
  originalPrompt?: unknown;
  projectId?: unknown;
  sessionId?: unknown;
  clientMessageId?: unknown;
  verbosity?: unknown;
  editorContext?: unknown;
  frameThumbs?: unknown;
  videoContext?: unknown;
};

type StreamMessage = {
  role: "assistant" | "user";
  content: string;
};

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as StreamRequest | null;
  const message = cleanText(body?.message);
  if (!message) {
    return Response.json({ error: "Message is required." }, { status: 400 });
  }

  const history = normalizeMessages(body?.messages);
  const sessionId = cleanText(body?.sessionId);
  const clientMessageId = cleanText(body?.clientMessageId);
  const projectId = cleanText(body?.projectId);
  const originalPrompt = cleanText(body?.originalPrompt);
  const editorContext = normalizeChatEditorContext(body?.editorContext);
  const frameReferences = frameRefsFromThumbs(body?.frameThumbs, editorContext);
  const intent = classifyPrometheusChatIntent(message);
  const directReply = createDirectPrometheusReply(message, intent);
  const knowledge = intent.useKnowledge
    ? retrievePrometheusKnowledge(
        [message, projectId, originalPrompt].filter(Boolean).join(" "),
        6,
      ).filter((match) => match.score >= 2)
    : [];
  const projectContext = projectId ? await loadProjectChatContext(projectId, {playheadSec: editorContext?.playheadSec}) : null;
  const encoder = new TextEncoder();

  const clientVideoContext = normalizeClientVideoContext(body?.videoContext);
  const projectContextBlock = projectContext?.video
    ? formatProjectContextForPrompt(projectContext)
    : clientVideoContext?.video
      ? formatClientVideoContextForPrompt(clientVideoContext)
      : projectContext
        ? formatProjectContextForPrompt(projectContext)
        : "";
  const hasVideo =
    Boolean(projectContext?.video) || Boolean(clientVideoContext?.video);
  const activeVideo = projectContext?.video ?? clientVideoContext?.video ?? null;
  const activeRecommendation =
    projectContext?.editorialAnalysis?.recommendations[0] ??
    clientVideoContext?.editorialAnalysis?.recommendations[0] ??
    null;
  const toolsEnabled =
    intent.allowTools || Boolean(editorContext) || Boolean(projectContext?.video) || Boolean(clientVideoContext?.video);

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: PrometheusChatStreamEvent) => {
        controller.enqueue(
          encoder.encode(encodePrometheusChatStreamEvent(event)),
        );
      };

      const sendThought = (content: string) => {
        send({ type: "thought", content });
      };

      let reply = "";
      let toolCalls: PrometheusToolCall[] = [];
      try {
        send({
          type: "status",
          message: intent.useKnowledge
            ? "Reading Prometheus guidance"
            : "Preparing response",
        });

        if (directReply) {
          reply = directReply;
          send({ type: "delta", content: directReply });
        } else {
          const apiKey = cleanText(process.env.GROQ_API_KEY);
          if (!apiKey) {
            reply = createLocalPrometheusFallback({
              intentKind: intent.kind,
              knowledgeAnswer: knowledge.length
                ? createExtractivePrometheusAnswer(message, knowledge, 900)
                : null,
              projectTitle: projectContext?.title,
              filename: activeVideo?.filename,
              durationSec: activeVideo?.durationMs
                ? activeVideo.durationMs / 1000
                : editorContext?.durationSec,
              playheadSec: editorContext?.playheadSec,
              recommendation: activeRecommendation,
            });
            send({ type: "delta", content: reply });
          } else {
            const groq = new Groq({ apiKey });
            const model =
              cleanText(process.env.GROQ_CHAT_MODEL) ||
              cleanText(process.env.GROQ_MODEL) ||
              DEFAULT_GROQ_MODEL;
            const fallbackModel = "openai/gpt-oss-20b";
            const maxTokens = normalizeMaxTokens(body?.verbosity);

            emitVideoContextThoughts(sendThought, projectContext, editorContext, knowledge);

            const systemPrompt = buildStreamSystemPrompt({
              intentInstruction: getPrometheusIntentInstruction(intent),
              knowledgeContext: formatKnowledgeContext(knowledge),
              originalPrompt,
              projectId,
              projectContextBlock,
              editorContext,
              frameReferences,
              toolsEnabled,
              hasVideo,
            });
            const groqMessages = [
              { role: "system", content: systemPrompt },
              ...history.slice(-12),
              { role: "user", content: message },
            ] as const;

            const streamCompleteAnswer = async ({
              messages,
              selectedModel,
              temperature,
            }: {
              messages: unknown[];
              selectedModel: string;
              temperature: number;
            }) => {
              const originalMessages = [...messages];
              let continuationMessages = originalMessages;

              for (let pass = 0; pass < MAX_COMPLETION_PASSES; pass += 1) {
                const completion = await groq.chat.completions.create(
                  {
                    model: selectedModel,
                    messages: continuationMessages as never,
                    temperature,
                    max_tokens: maxTokens,
                    stream: true,
                  },
                  { signal: request.signal },
                );

                let finishReason: string | null = null;
                let passContent = "";
                for await (const chunk of completion) {
                  const choice = chunk.choices[0];
                  finishReason = choice?.finish_reason ?? finishReason;
                  const content = choice?.delta?.content ?? "";
                  if (!content) continue;
                  passContent += content;
                  reply += content;
                  send({ type: "delta", content });
                }

                if (finishReason !== "length") return;
                if (!passContent.trim()) throw new Error("Prometheus response reached its token limit without producing more content.");
                if (pass === MAX_COMPLETION_PASSES - 1) {
                  throw new Error("Prometheus could not complete the response within the continuation limit.");
                }

                sendThought("Completing the remaining plan...");
                continuationMessages = [
                  ...originalMessages,
                  { role: "assistant", content: reply },
                  {
                    role: "user",
                    content: "Continue exactly where the prior response stopped. Do not repeat any heading, row, or sentence. Complete all open Markdown structures and end with the requested next-step choices.",
                  },
                ];
              }
            };

            let streamed = false;

            if (toolsEnabled) {
              try {
                sendThought("Planning editorial approach...");

                const planning = await groq.chat.completions.create(
                  {
                    model,
                    messages: [...groqMessages],
                    tools: [...PROMETHEUS_TOOLS],
                    tool_choice: "auto",
                    temperature: 0.3,
                    max_tokens: 620,
                    stream: false,
                  },
                  { signal: request.signal },
                );

                const planMessage = planning.choices?.[0]?.message as unknown as
                  | Record<string, unknown>
                  | undefined;

                const planContent = typeof planMessage?.content === "string" ? planMessage.content.trim() : "";
                if (planContent) {
                  sendThought(planContent);
                }

                const requested = normalizeGroqToolCalls(planMessage?.tool_calls);
                if (requested.length) {
                  send({ type: "status", message: "Running editorial tools" });
                  toolCalls = [];
                  const streamJobs: ChatMediaJob[] = [];
                  for (const toolCall of requested) {
                    if (toolCall.name === "submit_editor_job") {
                      const submitted = await submitEditorJob(toolCall, { message, projectId, sessionId });
                      if (submitted) {
                        toolCalls.push(submitted.toolCall);
                        if (submitted.job) streamJobs.push(submitted.job);
                        send({
                          type: "tool",
                          toolCall: {
                            id: submitted.toolCall.id,
                            name: submitted.toolCall.name,
                            label: submitted.toolCall.label,
                            status: submitted.toolCall.status,
                            summary: submitted.toolCall.summary,
                          },
                        });
                      }
                      continue;
                    }
                    const completedToolCall = executePrometheusTool(toolCall, {
                      latestMessage: message,
                      knowledge,
                      frameReferences,
                      projectId,
                    });
                    toolCalls.push(completedToolCall);
                    send({
                      type: "tool",
                      toolCall: {
                        id: completedToolCall.id,
                        name: completedToolCall.name,
                        label: completedToolCall.label,
                        status: completedToolCall.status,
                        summary: completedToolCall.summary,
                      },
                    });
                  }

                  sendThought("Composing final answer with tool results...");

                  const followupMessages = [
                        ...groqMessages,
                        {
                          role: "assistant",
                          content: planContent,
                          tool_calls: planMessage?.tool_calls,
                        },
                        ...toolCalls.map((toolCall) => ({
                          role: "tool" as const,
                          tool_call_id: toolCall.id,
                          content: JSON.stringify(toolCall.output),
                        })),
                      ];

                  send({ type: "status", message: "Drafting your answer" });
                  streamed = true;
                  await streamCompleteAnswer({ messages: followupMessages, selectedModel: model, temperature: 0.38 });
                }
              } catch (error) {
                if (isToolUseFailed(error)) {
                  console.warn(
                    "[prometheus-chat-stream] tool planning failed; answering without tools",
                  );
                  toolCalls = [];
                } else if (!request.signal.aborted) {
                  console.warn(
                    "[prometheus-chat-stream] tool planning errored; answering without tools",
                  );
                  toolCalls = [];
                } else {
                  throw error;
                }
              }
            }

            if (!streamed) {
              sendThought("Generating response...");

              const modelsToTry = model === fallbackModel ? [model] : [model, fallbackModel];
              let completionFailed = false;

              for (let attempt = 0; attempt < modelsToTry.length; attempt += 1) {
                const attemptModel = modelsToTry[attempt];
                try {
                  await streamCompleteAnswer({
                    messages: [...groqMessages],
                    selectedModel: attemptModel,
                    temperature: intent.kind === "conversation" ? 0.52 : 0.38,
                  });
                  completionFailed = false;
                  break;
                } catch (error) {
                  if (request.signal.aborted) throw error;
                  if (isToolUseFailed(error)) {
                    console.warn("[prometheus-chat-stream] generation tool failure; retrying without tools");
                    completionFailed = true;
                    break;
                  }
                  if (attempt < modelsToTry.length - 1) {
                    console.warn(`[prometheus-chat-stream] model ${attemptModel} failed; falling back to ${modelsToTry[attempt + 1]}`);
                    completionFailed = true;
                    continue;
                  }
                  throw error;
                }
              }

              if (completionFailed && !reply.trim()) {
                sendThought("Falling back to extractive guidance...");
                const fallback = knowledge.length
                  ? createExtractivePrometheusAnswer(message, knowledge, maxTokens)
                  : createLocalPrometheusFallback({
                      intentKind: intent.kind,
                      projectTitle: projectContext?.title,
                      filename: activeVideo?.filename,
                      durationSec: activeVideo?.durationMs
                        ? activeVideo.durationMs / 1000
                        : editorContext?.durationSec,
                      playheadSec: editorContext?.playheadSec,
                    });
                reply = fallback;
                send({ type: "delta", content: fallback });
              }
            }
          }
        }

        if (!reply.trim()) {
          reply =
            "I couldn't complete that response. Please try once more with the result you want from the edit.";
          send({ type: "delta", content: reply });
        }

        const streamJobs = collectStreamJobs(toolCalls);
        const actionDrafts = collectActionDrafts(toolCalls);
        const frames = toolCalls.length ? toFramePayload(frameReferences, toolCalls) : [];
        const editorialRecommendations = projectContext?.editorialAnalysis?.recommendations ?? [];
        const followUpSuggestions = buildChatFollowUpSuggestions(message, reply);
        const persisted = await persistAssistantReply(sessionId, reply, clientMessageId, streamJobs);
        if (knowledge.length || toolCalls.length || actionDrafts.length || frames.length || streamJobs.length || followUpSuggestions.length || projectContext?.editorialAnalysis || projectContext?.transcript?.text) {
          send({
            type: "metadata",
            sources: [
              ...(projectContext?.editorialAnalysis || projectContext?.transcript?.text
                ? [{
                    title: projectContext.transcript?.rangeMs
                      ? "Saved video analysis at the current playhead"
                      : "Saved video analysis",
                    type: "video-context",
                  }]
                : []),
              ...knowledge.slice(0, 5).map((match) => ({
                title: match.title || "Prometheus guidance",
                type: "knowledge",
              })),
              ...(editorialRecommendations.length > 0 ? editorialRecommendations.slice(0, 3).map((rec) => ({
                title: rec.title,
                type: "recommendation" as const,
              })) : []),
            ],
            frames,
            toolCalls,
            actionDrafts,
            jobs: streamJobs,
            suggestions: followUpSuggestions.length > 0
              ? followUpSuggestions
              : editorialRecommendations.length > 0
              ? editorialRecommendations.slice(0, 3).map((rec) => `Try: ${rec.title}`)
              : undefined,
            carousel: editorialRecommendations.length > 0
              ? editorialRecommendations.slice(0, 4).map((rec, index) => ({
                  id: `rec-${index}`,
                  kind: "action" as const,
                  title: rec.title,
                  subtitle: rec.rationale.slice(0, 80),
                  payload: rec.rangeMs
                    ? { message: `Apply recommendation: ${rec.title}` }
                    : undefined,
                }))
              : undefined,
          });
        }
        send({ type: "done", persisted });

        if (sessionId && message.trim()) {
          void extractAndUpdateSessionTitle(sessionId, message, reply).catch(() => {});
        }
      } catch (error) {
        if (request.signal.aborted) {
          controller.close();
          return;
        }

        console.error("[prometheus-chat-stream] generation failed", error);
        const errorMessage = error instanceof Error ? error.message.toLowerCase() : "";
        const userFacingMessage = errorMessage.includes("429") || errorMessage.includes("rate")
            ? "Prometheus is receiving too many requests. Please wait a moment and retry."
            : "";
        if (userFacingMessage) {
          send({ type: "error", message: userFacingMessage });
          return;
        }
        const fallback = createLocalPrometheusFallback({
          intentKind: intent.kind,
          knowledgeAnswer: knowledge.length
            ? createExtractivePrometheusAnswer(message, knowledge, 900)
            : null,
          projectTitle: projectContext?.title,
          filename: activeVideo?.filename,
          durationSec: activeVideo?.durationMs
            ? activeVideo.durationMs / 1000
            : editorContext?.durationSec,
          playheadSec: editorContext?.playheadSec,
          recommendation: activeRecommendation,
        });
        sendThought("Continuing with the local editorial context...");
        send({ type: "delta", content: fallback });
        send({ type: "done", persisted: false });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Cache-Control": "no-cache, no-transform",
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "X-Accel-Buffering": "no",
    },
  });
}

function emitVideoContextThoughts(
  sendThought: (content: string) => void,
  projectContext: ProjectChatContext | null,
  editorContext: ChatEditorContext | null,
  knowledge: PrometheusKnowledgeMatch[],
) {
  if (projectContext?.video) {
    const video = projectContext.video;
    const parts: string[] = [];
    if (video.filename) parts.push(`file: ${video.filename}`);
    if (video.durationMs !== null) parts.push(`duration: ${formatDuration(video.durationMs)}`);
    if (video.width && video.height) parts.push(`resolution: ${video.width}x${video.height}`);
    if (video.fps) parts.push(`${video.fps}fps`);
    sendThought(`Video context: ${parts.join(", ")}`);
  }

  if (projectContext?.editorialAnalysis) {
    const analysis = projectContext.editorialAnalysis;
    sendThought(`Editorial analysis: ${analysis.summary}`);
    if (analysis.recommendations.length > 0) {
      sendThought(`Recommendations available: ${analysis.recommendations.map((r) => r.title).join(", ")}`);
    }
  }

  if (knowledge.length > 0) {
    sendThought(`Retrieved ${knowledge.length} relevant guidance references from Prometheus knowledge base`);
  }

  if (editorContext?.playheadSec !== undefined) {
    sendThought(`Playhead position: ${formatSecondsAsTimecode(editorContext.playheadSec)}`);
  }
}

function formatDuration(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function extractOneLinerTitle(userMessage: string, reply: string): string {
  const cleaned = userMessage
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^(?:i\s+(?:want\s+to\s+|need\s+to\s+|would\s+like\s+to\s+|am\s+(?:looking\s+to\s+|trying\s+to\s+))|please\s+|can\s+(?:you\s+)?|could\s+(?:you\s+)?|help\s+me\s+)/i, "")
    .replace(/\s+(?:please|thanks|thank\s+you)\s*$/i, "")
    .replace(/\bthis\s+video\b/gi, "video")
    .replace(/\bthe\s+video\b/gi, "video")
    .replace(/^edit\s+(?:this\s+)?video/i, "Edit video")
    .trim();

  if (cleaned.length <= 45) return cleaned || "New Chat";

  const bounded = cleaned.slice(0, 42);
  const boundary = Math.max(bounded.lastIndexOf(" "), bounded.lastIndexOf("."), bounded.lastIndexOf(","));
  const cut = boundary > 24 ? boundary : bounded.length;
  return `${cleaned.slice(0, cut).trim()}…`;
}

async function extractAndUpdateSessionTitle(
  sessionId: string,
  userMessage: string,
  reply: string,
) {
  if (!sessionId || !userMessage.trim()) return;
  try {
    const title = extractOneLinerTitle(userMessage, reply);
    if (title === "New Chat" || !title.trim()) return;
    const supabase = await createClient();
    await supabase.from("chat_sessions").update({
      title: title.trim(),
      updated_at: new Date().toISOString(),
    }).eq("id", sessionId);
  } catch {
    // Title extraction is best-effort
  }
}

function normalizeMessages(value: unknown): StreamMessage[] {
  if (!Array.isArray(value)) return [];

  return value.flatMap((entry): StreamMessage[] => {
    if (!entry || typeof entry !== "object") return [];
    const record = entry as Record<string, unknown>;
    const role =
      record.role === "assistant"
        ? "assistant"
        : record.role === "user"
          ? "user"
          : null;
    const content = cleanText(record.content);
    return role && content ? [{ role, content: content.slice(0, 2_400) }] : [];
  });
}

function frameRefsFromThumbs(
  value: unknown,
  editorContext: ChatEditorContext | null,
): ChatFrameReference[] {
  const thumbs = normalizeChatFrameThumbs(value);

  return thumbs.map((thumb, index) => {
    const timecode = thumb.label?.trim() || formatSecondsAsTimecode(thumb.timeSec);
    const nearPlayhead =
      editorContext?.playheadSec !== undefined &&
      Math.abs(thumb.timeSec - editorContext.playheadSec) <= 1;
    return {
      id: `thumb-${index + 1}`,
      label: timecode,
      timecode,
      seconds: thumb.timeSec,
      thumbnailUrl: thumb.url,
      reason: nearPlayhead ? "Frame at the current playhead position." : "",
    };
  });
}

function buildStreamSystemPrompt({
  intentInstruction,
  knowledgeContext,
  originalPrompt,
  projectId,
  projectContextBlock,
  editorContext,
  frameReferences,
  toolsEnabled,
  hasVideo,
}: {
  intentInstruction: string;
  knowledgeContext: string;
  originalPrompt: string;
  projectId: string;
  projectContextBlock: string;
  editorContext: ChatEditorContext | null;
  frameReferences: ChatFrameReference[];
  toolsEnabled: boolean;
  hasVideo: boolean;
}) {
  const editorLines: string[] = [];
  if (editorContext) {
    const playhead =
      editorContext.playheadSec !== undefined
        ? formatSecondsAsTimecode(editorContext.playheadSec)
        : "--:--";
    const duration =
      editorContext.durationSec !== undefined
        ? formatSecondsAsTimecode(editorContext.durationSec)
        : "--:--";
    editorLines.push(`Playhead: ${playhead} of ${duration}.`);
    if (editorContext.workspaceTab) editorLines.push(`Active workspace: ${editorContext.workspaceTab}.`);
    if (editorContext.fitMode) editorLines.push(`Preview fit: ${editorContext.fitMode}.`);
    if (editorContext.muted !== undefined)
      editorLines.push(`Preview audio: ${editorContext.muted ? "muted" : "unmuted"}.`);
  }

  return [
    "You are Prometheus — the elite, authoritative AI creative intelligence operating within Prometheus Studio. Speak with quiet mastery, extreme clarity, and absolute technical precision, analogous to JARVIS for post-production and editorial engineering.",
    intentInstruction,
    "Deliver immediate, high-value insight first. Maintain an effortless, authoritative tone. Never expose underlying LLM providers, internal APIs, tool execution mechanics, or system errors to the user.",
    "Use valid GitHub-flavored Markdown. When a comparison or plan has repeated fields, use a complete Markdown table with a header and separator row. Never emit a table as escaped or plain pipe-delimited text. Do not state an editor action occurred until it has been explicitly approved and confirmed.",
    "Ground every editorial plan in the supplied project metadata, duration, transcript, analysis, playhead, and frame references. Explicitly label missing evidence instead of inventing scene details. Vary the plan with the actual footage and request; never reuse a generic fixed plan.",
    "When the plan needs a user decision, end with one concise question and 2-4 explicit choices so the interface can present them as actionable controls.",
    "When the user's question is unrelated to video editing (e.g., general knowledge, casual conversation), answer naturally and concisely without forcing video-editing advice. If the user asks about a specific editing style or person you don't have knowledge of, be honest and offer to work with the video's existing material to find a comparable approach.",
    toolsEnabled
      ? "Execute available tools decisively. For editor navigation, transport, or layout shifts (seek, play/pause, fit, workspace), call draft_editor_actions with machine-readable actions immediately. For media-mutating changes (trim, split, captions, style, render), use kind \"propose\" to present a clear execution plan. Cite specific video frames using reference_video_frames whenever temporal precision is needed."
      : "",
    originalPrompt ? `Relevant creative direction: ${originalPrompt}` : "",
    projectId ? `Current project ID: ${projectId}` : "",
    projectContextBlock ? `Current project context:\n${projectContextBlock}` : "",
    hasVideo
      ? ""
      : "No source video is loaded in the current project. If the user references footage, clips, timestamps, a 48-second clip, or asks you to edit/transcribe a video, do NOT assume or invent any video details. State plainly that there is no source video yet and ask them to upload or attach footage first before any video processing can begin.",
    editorLines.length ? `Live editor state:\n${editorLines.join("\n")}` : "",
    frameReferences.length
      ? `Available video frame thumbnails (cite these by timecode when relevant):\n${frameReferences
          .map((frame) => `- ${frame.timecode}${frame.reason ? ` — ${frame.reason}` : ""}`)
          .join("\n")}`
      : "",
    knowledgeContext ? `Prometheus guidance:\n${knowledgeContext}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");
}

function normalizeMaxTokens(value: unknown) {
  const verbosity = cleanText(value).toLowerCase();
  if (verbosity === "deep" || verbosity === "long") return 2_000;
  if (verbosity === "brief") return 700;
  return 1_400;
}

async function persistAssistantReply(
  sessionId: string,
  content: string,
  clientMessageId: string,
  jobs?: ChatMediaJob[],
) {
  if (!sessionId || !content.trim()) return false;

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return false;

    const insertPayload: Record<string, unknown> = {
      session_id: sessionId,
      role: "assistant",
      content,
      metadata: jobs && jobs.length
        ? { transport: "stream", jobs }
        : { transport: "stream" },
    };

    const selectColumns = "id, session_id, role, content, platform, post_type, metadata, created_at";

    const { error } = await supabase.from("chat_messages").insert({
      ...insertPayload,
      client_message_id: clientMessageId || null,
    });

    if (error && isMissingColumnError(error)) {
      const { error: legacyError } = await supabase
        .from("chat_messages")
        .insert(insertPayload)
        .select(selectColumns);
      return !legacyError;
    }

    return !error || error.code === "23505";
  } catch {
    return false;
  }
}

function isMissingColumnError(error: { code?: string; message?: string }): boolean {
  return error.code === "42703" || error.code === "PGRST204" ||
    (typeof error.message === "string" && error.message.includes("client_message_id"));
}

type StreamChatMediaJob = ChatMediaJob;

async function submitEditorJob(
  toolCall: { id: string; name: string; arguments: unknown },
  context: { message: string; projectId: string; sessionId?: string },
) {
  const args = toolCall.arguments && typeof toolCall.arguments === "object"
    ? toolCall.arguments as Record<string, unknown>
    : {};
  const type = cleanText(args.type);
  const label = cleanText(args.label) || "Background processing";
  const description = cleanText(args.description);

  if (!type) {
    return {
      toolCall: {
        id: toolCall.id,
        name: toolCall.name,
        label: "Submit editor job",
        status: "failed" as const,
        input: args,
        output: { error: "A job type is required." },
        summary: "Job submission failed: missing type.",
      },
      job: null,
    };
  }

  const supabase = await createClient().catch(() => null);
  if (!supabase) {
    return {
      toolCall: {
        id: toolCall.id,
        name: toolCall.name,
        label: "Submit editor job",
        status: "failed" as const,
        input: args,
        output: { error: "No database session available for job submission." },
        summary: "Job submission failed: no database session.",
      },
      job: null,
    };
  }

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return {
        toolCall: {
          id: toolCall.id,
          name: toolCall.name,
          label: "Submit editor job",
          status: "failed" as const,
          input: args,
          output: { error: "Sign in to submit background jobs." },
          summary: "Job submission failed: not signed in.",
        },
        job: null,
      };
    }

    if (!context.projectId) {
      return {
        toolCall: {
          id: toolCall.id,
          name: toolCall.name,
          label: "Submit editor job",
          status: "failed" as const,
          input: args,
          output: { error: "A project is required to run background jobs." },
          summary: "Job submission failed: no project linked.",
        },
        job: null,
      };
    }

    const { data: job, error } = await supabase
      .from("durable_jobs")
      .insert({
        user_id: user.id,
        project_id: context.projectId,
        type,
        status: "pending",
        progress: 0,
        result_metadata: description
          ? { label, description, sessionId: context.sessionId ?? null }
          : { label, sessionId: context.sessionId ?? null },
      })
      .select("id, status, progress")
      .single();

    if (error || !job) {
      return {
        toolCall: {
          id: toolCall.id,
          name: toolCall.name,
          label: "Submit editor job",
          status: "failed" as const,
          input: args,
          output: { error: error?.message ?? "Unable to queue the job." },
          summary: "Job submission failed.",
        },
        job: null,
      };
    }

    const streamJob: StreamChatMediaJob = {
      id: String(job.id),
      label,
      state: "queued",
      statusUrl: `/api/jobs/${encodeURIComponent(String(job.id))}/status`,
    };

    return {
      toolCall: {
        id: toolCall.id,
        name: toolCall.name,
        label: "Submit editor job",
        status: "completed" as const,
        input: args,
        output: { status: "queued", jobId: String(job.id) },
        summary: `Background job queued with id ${String(job.id).slice(0, 8)}.`,
      },
      job: streamJob,
    };
  } catch {
    return {
      toolCall: {
        id: toolCall.id,
        name: toolCall.name,
        label: "Submit editor job",
        status: "failed" as const,
        input: args,
        output: { error: "Unexpected job submission failure." },
        summary: "Job submission failed.",
      },
      job: null,
    };
  }
}

function collectStreamJobs(toolCalls: PrometheusToolCall[]): StreamChatMediaJob[] {
  const jobs: StreamChatMediaJob[] = [];
  for (const toolCall of toolCalls) {
    if (toolCall.name !== "submit_editor_job") continue;
    const output = toolCall.output && typeof toolCall.output === "object"
      ? toolCall.output as Record<string, unknown>
      : {};
    const jobId = cleanText(output.jobId);
    const input = toolCall.input && typeof toolCall.input === "object"
      ? toolCall.input as Record<string, unknown>
      : {};
    const label = cleanText(input.label) || "Background processing";
    if (jobId) {
      jobs.push({
        id: jobId,
        label,
        state: "queued",
        statusUrl: `/api/jobs/${encodeURIComponent(jobId)}/status`,
      });
    }
  }
  return jobs;
}

function cleanText(value: unknown) {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";
}

function normalizeClientVideoContext(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  const videoRecord = record.video as Record<string, unknown> | null | undefined;
  if (!videoRecord || typeof videoRecord !== "object") return null;
  const video = {
    filename: cleanText(videoRecord.filename) || null,
    mimeType: cleanText(videoRecord.mimeType) || null,
    durationMs: typeof videoRecord.durationMs === "number" && Number.isFinite(videoRecord.durationMs) ? videoRecord.durationMs : null,
    width: typeof videoRecord.width === "number" && Number.isFinite(videoRecord.width) ? videoRecord.width : null,
    height: typeof videoRecord.height === "number" && Number.isFinite(videoRecord.height) ? videoRecord.height : null,
    fps: typeof videoRecord.fps === "number" && Number.isFinite(videoRecord.fps) ? videoRecord.fps : null,
  };
  const analysis = record.editorialAnalysis as Record<string, unknown> | null | undefined;
  return {
    video,
    transcriptAvailable: record.transcriptAvailable === true,
    editorialAnalysis: analysis && typeof analysis === "object"
      ? {
          summary: cleanText(analysis.summary) || null,
          pacing: cleanText(analysis.pacing) || null,
          recommendations: Array.isArray(analysis.recommendations)
            ? analysis.recommendations.flatMap((item) => {
                if (!item || typeof item !== "object") return [];
                const rec = item as Record<string, unknown>;
                const title = cleanText(rec.title);
                const rationale = cleanText(rec.rationale);
                return title && rationale ? [{ title, rationale, rangeMs: null }] : [];
              }).slice(0, 4)
            : [],
        }
      : null,
    ingestionStatus: cleanText(record.ingestionStatus) || null,
  };
}

function formatClientVideoContextForPrompt(context: NonNullable<ReturnType<typeof normalizeClientVideoContext>>) {
  const lines: string[] = ["Project: current editorial session"];
  const video = context.video;
  if (video) {
    const parts = [
      video.filename ? `file: ${video.filename}` : "",
      video.durationMs !== null ? `duration: ${formatDuration(video.durationMs)}` : "",
      video.width && video.height ? `resolution: ${video.width}x${video.height}` : "",
      video.fps ? `fps: ${video.fps}` : "",
    ].filter(Boolean);
    lines.push(parts.length ? `Video - ${parts.join(", ")}` : "Video uploaded.");
  } else {
    lines.push("Video: none uploaded yet.");
  }
  if (context.ingestionStatus && context.ingestionStatus !== "completed") {
    lines.push(`Analysis status: ${context.ingestionStatus}; do not claim missing analysis is complete.`);
  }
  if (context.editorialAnalysis) {
    if (context.editorialAnalysis.summary) lines.push(`Saved editorial analysis: ${context.editorialAnalysis.summary}`);
    if (context.editorialAnalysis.recommendations.length) {
      lines.push(`Saved recommendations:\n${context.editorialAnalysis.recommendations.map((item) => `- ${item.title}: ${item.rationale}`).join("\n")}`);
    }
  }
  if (context.transcriptAvailable) lines.push("Transcript: available.");
  return lines.join("\n");
}
