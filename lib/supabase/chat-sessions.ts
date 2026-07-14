"use client";

import { createClient } from "@/lib/supabase/client";

export type ChatSession = {
  id: string;
  user_id: string;
  project_id: string | null;
  title: string;
  created_at: string;
  updated_at: string;
};

async function getCurrentUserId() {
  const supabase = createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) throw error;
  if (!user) throw new Error("Sign in to save chat history.");
  return { supabase, userId: user.id };
}

export async function getUserChatSessions(limit = 20) {
  const { supabase } = await getCurrentUserId();
  const { data, error } = await supabase
    .from("chat_sessions")
    .select("id, user_id, project_id, title, created_at, updated_at")
    .order("updated_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data ?? []) as ChatSession[];
}

export async function getProjectChatSessions(projectId: string, limit = 20) {
  const { supabase } = await getCurrentUserId();
  const { data, error } = await supabase
    .from("chat_sessions")
    .select("id, user_id, project_id, title, created_at, updated_at")
    .eq("project_id", projectId)
    .order("updated_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data ?? []) as ChatSession[];
}

export async function getChatSession(sessionId: string) {
  const { supabase } = await getCurrentUserId();
  const { data, error } = await supabase
    .from("chat_sessions")
    .select("id, user_id, project_id, title, created_at, updated_at")
    .eq("id", sessionId)
    .maybeSingle();

  if (error) throw error;
  return data as ChatSession | null;
}

export async function createChatSession(projectId?: string | null, title = "New Chat") {
  const { supabase, userId } = await getCurrentUserId();
  const { data, error } = await supabase
    .from("chat_sessions")
    .insert({ user_id: userId, project_id: projectId ?? null, title })
    .select("id, user_id, project_id, title, created_at, updated_at")
    .single();

  if (error) throw error;
  return data as ChatSession;
}

export async function updateChatSessionTitle(sessionId: string, title: string) {
  const { supabase } = await getCurrentUserId();
  const { data, error } = await supabase
    .from("chat_sessions")
    .update({ title: title.trim() || "New Chat", updated_at: new Date().toISOString() })
    .eq("id", sessionId)
    .select("id, user_id, project_id, title, created_at, updated_at")
    .single();

  if (error) throw error;
  return data as ChatSession;
}

export async function deleteChatSession(sessionId: string) {
  const { supabase } = await getCurrentUserId();
  const { error } = await supabase.from("chat_sessions").delete().eq("id", sessionId);
  if (error) throw error;
}
