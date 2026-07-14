"use client";

import { createClient } from "@/lib/supabase/client";

export type ChatMessageRole = "user" | "assistant" | "system";

export type ChatMessageRecord = {
  id: string;
  session_id: string;
  role: ChatMessageRole;
  content: string;
  platform: string | null;
  post_type: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
};

export type ChatMessageInsert = {
  role: ChatMessageRole;
  content: string;
  platform?: string | null;
  post_type?: string | null;
  metadata?: Record<string, unknown>;
};

export async function getChatMessages(sessionId: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("chat_messages")
    .select("id, session_id, role, content, platform, post_type, metadata, created_at")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return (data ?? []) as ChatMessageRecord[];
}

export async function insertChatMessage(sessionId: string, payload: ChatMessageInsert) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("chat_messages")
    .insert({
      session_id: sessionId,
      role: payload.role,
      content: payload.content,
      platform: payload.platform ?? null,
      post_type: payload.post_type ?? null,
      metadata: payload.metadata ?? {},
    })
    .select("id, session_id, role, content, platform, post_type, metadata, created_at")
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
        post_type: payload.post_type ?? null,
        metadata: payload.metadata ?? {},
      })),
    )
    .select("id, session_id, role, content, platform, post_type, metadata, created_at");

  if (error) throw error;
  return (data ?? []) as ChatMessageRecord[];
}

export async function deleteChatMessages(sessionId: string) {
  const supabase = createClient();
  const { error } = await supabase.from("chat_messages").delete().eq("session_id", sessionId);
  if (error) throw error;
}
