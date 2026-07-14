"use client";

import { createChatSession, type ChatSession } from "@/lib/supabase/chat-sessions";

export async function createAndActivateAIChatSession(
  projectId: string | null,
  onCreated: (session: ChatSession) => void,
) {
  const session = await createChatSession(projectId);
  onCreated(session);
  return session;
}
