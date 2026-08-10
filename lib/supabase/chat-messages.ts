"use client";

import { createClient } from "@/lib/supabase/client";
import {
  type ChatMessageInsert as ChatMessageInsertRecord,
  type ChatMessageRecord as StoredChatMessageRecord,
  type ChatMessageRole as StoredChatMessageRole,
  isLocalChatSessionId,
} from "@/lib/prometheus-assistant/local-chat-history";
import { getScopedLocalChatHistoryStore } from "@/lib/supabase/chat-local-history";

export type ChatMessageRole = StoredChatMessageRole;
export type ChatMessageRecord = StoredChatMessageRecord;
export type ChatMessageInsert = ChatMessageInsertRecord;

const CHAT_MESSAGE_SELECT =
  "id, session_id, role, content, platform, post_type, metadata, client_message_id, created_at";
// Same list without client_message_id, for databases that have not run
// supabase/migrations/202607280001_chat_message_idempotency.sql yet.
const CHAT_MESSAGE_SELECT_WITHOUT_CLIENT_ID =
  "id, session_id, role, content, platform, post_type, metadata, created_at";

// PostgREST reports a missing column as 42703 (undefined_column) or PGRST204
// (column absent from the schema cache), and the message usually names the column.
export function isMissingClientMessageIdError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const message = (error as { message?: unknown }).message;
  if (typeof message === "string" && message.includes("client_message_id")) return true;
  const code = (error as { code?: unknown }).code;
  return code === "42703" || code === "PGRST204";
}

export function mapChatMessageRecord(row: Record<string, unknown>): ChatMessageRecord {
  return {
    id: String(row.id ?? ""),
    client_message_id: typeof row.client_message_id === "string" ? row.client_message_id : null,
    session_id: String(row.session_id ?? ""),
    role: row.role === "assistant" ? "assistant" : row.role === "system" ? "system" : "user",
    content: typeof row.content === "string" ? row.content : "",
    platform: typeof row.platform === "string" ? row.platform : null,
    post_type: typeof row.post_type === "string" ? row.post_type : null,
    metadata:
      row.metadata && typeof row.metadata === "object" && !Array.isArray(row.metadata)
        ? (row.metadata as Record<string, unknown>)
        : {},
    created_at: typeof row.created_at === "string" ? row.created_at : "",
  };
}

export type ChatMessageQueryRunner = (
  columns: string,
) => Promise<{ data: Record<string, unknown>[] | null; error: unknown }>;

export async function fetchChatMessageRows(
  runQuery: ChatMessageQueryRunner,
): Promise<ChatMessageRecord[]> {
  const full = await runQuery(CHAT_MESSAGE_SELECT);
  if (!full.error) return (full.data ?? []).map(mapChatMessageRecord);

  // Only the missing-column path falls through to the retry; every other
  // error (RLS, network, auth) must surface to the caller unchanged.
  if (!isMissingClientMessageIdError(full.error)) throw full.error;

  const fallback = await runQuery(CHAT_MESSAGE_SELECT_WITHOUT_CLIENT_ID);
  if (fallback.error) throw fallback.error;
  return (fallback.data ?? []).map(mapChatMessageRecord);
}

async function getRemoteChatMessages(sessionId: string) {
  const supabase = createClient();
  return fetchChatMessageRows(async (columns) => {
    const { data, error } = await supabase
      .from("chat_messages")
      .select(columns)
      .eq("session_id", sessionId)
      .order("created_at", { ascending: true });
    return { data: (data ?? null) as Record<string, unknown>[] | null, error };
  });
}

async function insertRemoteChatMessage(sessionId: string, payload: ChatMessageInsert) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("chat_messages")
    .insert({
      session_id: sessionId,
      role: payload.role,
      content: payload.content,
      client_message_id: payload.client_message_id ?? null,
      platform: payload.platform ?? null,
      post_type: payload.post_type ?? null,
      metadata: payload.metadata ?? {},
    })
    .select("id, session_id, role, content, platform, post_type, metadata, client_message_id, created_at")
    .single();

  if (error && isMissingClientMessageIdError(error)) {
    const { data: legacyData, error: legacyError } = await supabase
      .from("chat_messages")
      .insert({
        session_id: sessionId,
        role: payload.role,
        content: payload.content,
        platform: payload.platform ?? null,
        post_type: payload.post_type ?? null,
        metadata: payload.metadata ?? {},
      })
      .select(CHAT_MESSAGE_SELECT_WITHOUT_CLIENT_ID)
      .single();
    if (legacyError) throw legacyError;
    return mapChatMessageRecord(legacyData as Record<string, unknown>);
  }
  if (error) throw error;
  return data as ChatMessageRecord;
}

async function insertRemoteChatMessages(sessionId: string, payloads: ChatMessageInsert[]) {
  if (!payloads.length) return [];

  const supabase = createClient();
  const { data, error } = await supabase
    .from("chat_messages")
    .insert(
      payloads.map((payload) => ({
        session_id: sessionId,
        role: payload.role,
        content: payload.content,
        platform: payload.platform ?? null,
        client_message_id: payload.client_message_id ?? null,
        post_type: payload.post_type ?? null,
        metadata: payload.metadata ?? {},
      })),
    )
    .select("id, session_id, role, content, platform, post_type, metadata, client_message_id, created_at");

  if (error) throw error;
  return (data ?? []) as ChatMessageRecord[];
}

async function deleteRemoteChatMessages(sessionId: string) {
  const supabase = createClient();
  const { error } = await supabase.from("chat_messages").delete().eq("session_id", sessionId);
  if (error) throw error;
}

function mergeMessages(remote: ChatMessageRecord[], local: ChatMessageRecord[]) {
  const messages = new Map<string, ChatMessageRecord>();
  for (const message of [...remote, ...local]) {
    const key = message.client_message_id
      ? `${message.session_id}:${message.client_message_id}`
      : message.id;
    messages.set(key, message);
  }
  return [...messages.values()].sort((left, right) => left.created_at.localeCompare(right.created_at));
}

function mirrorRemoteMessages(
  localHistory: Awaited<ReturnType<typeof getScopedLocalChatHistoryStore>>,
  messages: ChatMessageRecord[],
) {
  try {
    localHistory.upsertMessages(messages);
  } catch (error) {
    console.warn("[chat-messages] local history mirror unavailable", error);
  }
}

export async function getChatMessages(sessionId: string) {
  const localHistory = await getScopedLocalChatHistoryStore();
  const local = localHistory.getMessages(sessionId);
  if (isLocalChatSessionId(sessionId)) return local;
  try {
    const remote = await getRemoteChatMessages(sessionId);
    mirrorRemoteMessages(localHistory, remote);
    return mergeMessages(remote, local);
  } catch (error) {
    console.warn("[chat-messages] remote history unavailable; using local messages", error);
    return local;
  }
}

export async function insertChatMessage(sessionId: string, payload: ChatMessageInsert) {
  const localHistory = await getScopedLocalChatHistoryStore();
  if (isLocalChatSessionId(sessionId)) {
    return localHistory.insertMessage(sessionId, payload) as ChatMessageRecord;
  }
  try {
    const message = await insertRemoteChatMessage(sessionId, payload);
    mirrorRemoteMessages(localHistory, [message]);
    return message;
  } catch (error) {
    console.warn("[chat-messages] remote save unavailable; saving message locally", error);
    return localHistory.insertMessage(sessionId, payload) as ChatMessageRecord;
  }
}

export async function insertChatMessages(sessionId: string, payloads: ChatMessageInsert[]) {
  const localHistory = await getScopedLocalChatHistoryStore();
  if (isLocalChatSessionId(sessionId)) {
    return localHistory.insertMessages(sessionId, payloads) as ChatMessageRecord[];
  }
  try {
    const messages = await insertRemoteChatMessages(sessionId, payloads);
    mirrorRemoteMessages(localHistory, messages);
    return messages;
  } catch (error) {
    console.warn("[chat-messages] remote batch save unavailable; saving messages locally", error);
    return localHistory.insertMessages(sessionId, payloads) as ChatMessageRecord[];
  }
}

export async function deleteChatMessages(sessionId: string) {
  const localHistory = await getScopedLocalChatHistoryStore();
  if (isLocalChatSessionId(sessionId)) {
    localHistory.deleteMessages(sessionId);
    return;
  }
  await deleteRemoteChatMessages(sessionId);
  localHistory.deleteMessages(sessionId);
}
