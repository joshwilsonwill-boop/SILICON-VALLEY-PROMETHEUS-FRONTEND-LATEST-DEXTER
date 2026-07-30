"use client";

import { createClient } from "@/lib/supabase/client";

export type ChatMessageRole = "user" | "assistant" | "system";

export type ChatMessageRecord = {
  id: string;
  client_message_id: string | null;
  session_id: string;
  role: ChatMessageRole;
  content: string;
  platform: string | null;
  post_type: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
};

export type ChatMessageInsert = {
  client_message_id?: string | null;
  role: ChatMessageRole;
  content: string;
  platform?: string | null;
  post_type?: string | null;
  metadata?: Record<string, unknown>;
};

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

export async function getChatMessages(sessionId: string) {
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

export async function insertChatMessage(sessionId: string, payload: ChatMessageInsert) {
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

  if (error) throw error;
  return data as ChatMessageRecord;
}

export async function insertChatMessages(sessionId: string, payloads: ChatMessageInsert[]) {
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

export async function deleteChatMessages(sessionId: string) {
  const supabase = createClient();
  const { error } = await supabase.from("chat_messages").delete().eq("session_id", sessionId);
  if (error) throw error;
}
