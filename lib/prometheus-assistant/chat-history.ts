export type ChatHistorySession = {
  id: string;
  title: string;
  updated_at: string;
};

export type ChatHistoryGroup<T extends ChatHistorySession> = {
  label: "Today" | "Yesterday" | "Previous 7 days" | "Older";
  sessions: T[];
};

export function groupChatSessions<T extends ChatHistorySession>(
  sessions: T[],
  now = new Date(),
): ChatHistoryGroup<T>[] {
  const groups: ChatHistoryGroup<T>[] = [
    { label: "Today", sessions: [] },
    { label: "Yesterday", sessions: [] },
    { label: "Previous 7 days", sessions: [] },
    { label: "Older", sessions: [] },
  ];
  const today = startOfLocalDay(now).getTime();

  for (const session of sessions) {
    const updatedAt = new Date(session.updated_at);
    const ageInDays = Math.max(
      0,
      Math.round(
        (today - startOfLocalDay(updatedAt).getTime()) / (24 * 60 * 60 * 1000),
      ),
    );
    const groupIndex =
      ageInDays === 0 ? 0 : ageInDays === 1 ? 1 : ageInDays <= 7 ? 2 : 3;
    groups[groupIndex].sessions.push(session);
  }

  return groups.filter((group) => group.sessions.length > 0);
}

export function splitChatSessionTitle(title: string) {
  return title.trim().split(/\s+/).filter(Boolean);
}

function startOfLocalDay(value: Date) {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate());
}
