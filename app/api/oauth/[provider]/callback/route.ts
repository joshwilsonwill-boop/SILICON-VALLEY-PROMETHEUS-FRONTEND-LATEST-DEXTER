import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { PROVIDER_CONFIGS } from "@/lib/oauth/providers";
import { getAndDeleteState } from "@/lib/oauth/state-store";
import { sealToken } from "@/lib/crypto/token-vault";
import { OAuthProvider } from "@/lib/oauth/types";

export async function GET(request: NextRequest, { params }: any) {
  const provider = (await params).provider as OAuthProvider;
  const config = PROVIDER_CONFIGS[provider];
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim() || request.nextUrl.origin
  const settingsUrl = new URL(
    provider === 'google_drive' || provider === 'dropbox' ? '/settings' : '/settings/social-accounts',
    appUrl,
  )

  if (error) {
    settingsUrl.searchParams.set('error', 'oauth_failed')
    settingsUrl.searchParams.set('provider', provider)
    return NextResponse.redirect(settingsUrl)
  }
  if (!code || !state) {
    settingsUrl.searchParams.set('error', 'oauth_failed')
    settingsUrl.searchParams.set('provider', provider)
    return NextResponse.redirect(settingsUrl)
  }

  const stateData = await getAndDeleteState(state);
  if (!stateData || stateData.provider !== provider) {
    settingsUrl.searchParams.set('error', 'invalid_state')
    settingsUrl.searchParams.set('provider', provider)
    return NextResponse.redirect(settingsUrl)
  }

  // Surgical Fix: Dynamic Env Var Mapping and detailed logging
  const clientIdEnv = config.clientIdEnvVar || `${provider.toUpperCase()}_CLIENT_ID`;
  const clientSecretEnv = `${provider.toUpperCase()}_CLIENT_SECRET`;
  
  const clientId = process.env[clientIdEnv];
  const clientSecret = process.env[clientSecretEnv];

  if (!clientId || !clientSecret) {
    console.error(`[OAuth Callback] Missing credentials for ${provider}. Checked: ${clientIdEnv}, ${clientSecretEnv}`);
    settingsUrl.searchParams.set('error', 'oauth_failed')
    settingsUrl.searchParams.set('provider', provider)
    return NextResponse.redirect(settingsUrl)
  }

  const paramsBody = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    code,
    redirect_uri: stateData.redirectUri,
    grant_type: "authorization_code",
  });

  if (config.pkce) {
    paramsBody.append("code_verifier", stateData.codeVerifier);
  }

  try {
    const tokenResponse = await fetch(config.tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: paramsBody,
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error(`[OAuth Token Exchange Error] Provider: ${provider}, Status: ${tokenResponse.status}, Response:`, errorText);
      settingsUrl.searchParams.set('error', 'oauth_failed')
      settingsUrl.searchParams.set('provider', provider)
      return NextResponse.redirect(settingsUrl)
    }

    const tokenData = await tokenResponse.json();
    const sealedAccess = await sealToken(tokenData.access_token);
    const sealedRefresh = tokenData.refresh_token ? await sealToken(tokenData.refresh_token) : null;
    const providerAccountId = tokenData.open_id || tokenData.user_id || tokenData.sub || null
    const providerUsername = tokenData.username || tokenData.screen_name || tokenData.user_name || null

    const supabase = await createClient();
    const { error: dbError } = await supabase.from("user_connections").upsert({
      user_id: stateData.userId,
      provider,
      provider_user_id: providerAccountId,
      provider_username: providerUsername,
      encrypted_access_token: sealedAccess.ciphertext,
      encrypted_refresh_token: sealedRefresh?.ciphertext || null,
      iv: sealedAccess.iv,
      key_version: sealedAccess.keyVersion,
      scope: config.scopes.join(config.scopeSeparator),
      expires_at: tokenData.expires_in ? new Date(Date.now() + tokenData.expires_in * 1000).toISOString() : null,
      is_active: true,
    }, { onConflict: "user_id,provider" });

    if (dbError) {
      console.error("Database error:", dbError);
      settingsUrl.searchParams.set('error', 'oauth_failed')
      settingsUrl.searchParams.set('provider', provider)
      return NextResponse.redirect(settingsUrl)
    }

    // Clear memory
    tokenData.access_token = null;
    if (tokenData.refresh_token) tokenData.refresh_token = null;

    settingsUrl.searchParams.set('connected', provider)
    return NextResponse.redirect(settingsUrl);
  } catch (err: any) {
    console.error(`[OAuth Callback Fatal Error] Provider: ${provider}`, err);
    settingsUrl.searchParams.set('error', 'oauth_failed')
    settingsUrl.searchParams.set('provider', provider)
    return NextResponse.redirect(settingsUrl)
  }
}
