// server-only
import { createClient } from "@/lib/supabase/server";
import { sealToken, unsealToken } from "@/lib/crypto/token-vault";
import { PROVIDER_CONFIGS } from "./providers";
import { OAuthProvider } from "./types";

export async function getValidAccessToken(userId: string, provider: OAuthProvider): Promise<string | null> {
  const supabase = await createClient();
  const { data: connection } = await supabase
    .from("user_connections")
    .select("*")
    .eq("user_id", userId)
    .eq("provider", provider)
    .single();

  if (!connection) return null;

  const now = new Date();
  const expiresAt = connection.expires_at ? new Date(connection.expires_at) : null;

  // If token is still valid (with 5-min buffer), return it
  if (expiresAt && expiresAt.getTime() > now.getTime() + 5 * 60 * 1000) {
    return unsealToken({
      ciphertext: connection.encrypted_access_token,
      iv: connection.iv,
      keyVersion: connection.key_version
    });
  }

  // Otherwise, refresh it
  if (!connection.encrypted_refresh_token) return null;

  const refreshToken = await unsealToken({
    ciphertext: connection.encrypted_refresh_token,
    iv: connection.iv,
    keyVersion: connection.key_version
  });

  const config = PROVIDER_CONFIGS[provider];
  const response = await fetch(config.tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env[config.clientIdEnvVar ?? `${provider.toUpperCase()}_CLIENT_ID`]!,
      client_secret: process.env[`${provider.toUpperCase()}_CLIENT_SECRET`]!,
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });

  if (!response.ok) {
    console.error(`Failed to refresh ${provider} token:`, await response.text());
    await supabase.from("user_connections").update({ is_active: false }).eq("id", connection.id);
    return null;
  }

  const data = await response.json();
  const sealedAccess = await sealToken(data.access_token);
  const sealedRefresh = data.refresh_token ? await sealToken(data.refresh_token) : null;

  await supabase.from("user_connections").update({
    encrypted_access_token: sealedAccess.ciphertext,
    encrypted_refresh_token: sealedRefresh?.ciphertext || connection.encrypted_refresh_token,
    expires_at: data.expires_in ? new Date(Date.now() + data.expires_in * 1000).toISOString() : null,
    updated_at: new Date().toISOString(),
  }).eq("id", connection.id);

  return data.access_token;
}
