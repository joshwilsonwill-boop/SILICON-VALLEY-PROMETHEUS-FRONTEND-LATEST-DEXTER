const PLATFORM_CHOICES = ["YouTube", "Instagram", "TikTok", "Website", "LinkedIn", "X"] as const;

export function buildChatFollowUpSuggestions(message: string, reply: string): string[] {
  const combined = `${message}\n${reply}`;
  const asksForPlatform = /(?:confirm|choose|select|which|target)\s+(?:the\s+)?platform|target platform/i.test(reply);

  if (asksForPlatform) {
    return PLATFORM_CHOICES.filter((platform) => {
      const pattern = platform === "X"
        ? /(?:\bX\b|Twitter)/i
        : new RegExp(`\\b${platform}\\b`, "i");
      return pattern.test(combined);
    }).slice(0, 4);
  }

  return [];
}
