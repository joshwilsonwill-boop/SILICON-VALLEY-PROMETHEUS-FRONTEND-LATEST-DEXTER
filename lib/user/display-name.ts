import type { User } from "@supabase/supabase-js";

export type DisplayNameProfile = {
  display_name?: string | null;
  first_name?: string | null;
  full_name?: string | null;
} | null | undefined;

function cleanName(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function firstWord(value: string) {
  return value.split(/\s+/)[0] ?? "";
}

function isDefaultUsername(displayName: string, email?: string | null) {
  const normalizedDisplayName = displayName.trim().toLowerCase();
  const normalizedEmail = email?.trim().toLowerCase();
  const emailPrefix = normalizedEmail?.split("@")[0];

  return Boolean(
    normalizedDisplayName &&
      (normalizedDisplayName === normalizedEmail || normalizedDisplayName === emailPrefix),
  );
}

export function getUserDisplayName(user: User | null | undefined, profile?: DisplayNameProfile): string {
  if (!user) return "Creator";

  const metadata = user.user_metadata ?? {};
  const displayName = cleanName(profile?.display_name) || cleanName(metadata.display_name);
  if (displayName && !isDefaultUsername(displayName, user.email)) return firstWord(displayName);

  const firstName = cleanName(profile?.first_name) || cleanName(metadata.first_name);
  if (firstName) return firstWord(firstName);

  const fullName = cleanName(profile?.full_name) || cleanName(metadata.full_name) || cleanName(metadata.name);
  if (fullName && !isDefaultUsername(fullName, user.email)) return firstWord(fullName);

  return "Creator";
}

export function getChatGreeting(user: User | null | undefined, profile?: DisplayNameProfile) {
  const displayName = getUserDisplayName(user, profile);
  return displayName === "Creator"
    ? "What would you like to create today?"
    : `What would you like to create, ${displayName}?`;
}
