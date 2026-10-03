import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { distributeContent } from "@/lib/social";
import { OAuthProvider } from "@/lib/oauth/types";
import { exportRateLimit } from "@/lib/rate-limit";
import { configuredOAuthProviders } from '@/lib/oauth/capabilities';
import { computeErrorResponse, reserveCompute, settleCompute } from '@/lib/compute/credits';
import { parseComputeConfirmation } from '@/lib/compute/policy';

export async function POST(request: NextRequest, { params }: any) {
  const provider = (await params).provider as OAuthProvider;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!configuredOAuthProviders().includes(provider)) return NextResponse.json({ error: 'This destination is not configured.' }, { status: 503 });

  const { success: rateLimitOk } = await exportRateLimit.limit(user.id);
  if (!rateLimitOk) return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });

  let reservation: string | null = null;
  try {
    const body = await request.json();
    const { videoUrl, caption, ...metadata } = body;
    
    if (!videoUrl) return NextResponse.json({ error: "videoUrl is required" }, { status: 400 });
    const sourceUrl = new URL(videoUrl);
    if (sourceUrl.protocol !== 'https:') return NextResponse.json({ error: 'A stored HTTPS source is required for publishing.' }, { status: 400 });
    // Publish only stored media owned by this user; never proxy arbitrary URLs.
    const { data: assets } = await supabase.from('source_assets').select('public_url').eq('user_id', user.id).eq('public_url', videoUrl).limit(1);
    if (!assets?.length) return NextResponse.json({ error: 'Save this source to your account before publishing.' }, { status: 400 });
    const { data: connection } = await supabase.from('user_connections').select('is_active, expires_at').eq('user_id', user.id).eq('provider', provider).maybeSingle();
    if (!connection?.is_active || (connection.expires_at && Date.parse(connection.expires_at) <= Date.now())) return NextResponse.json({ error: 'Reconnect this account before publishing.' }, { status: 409 });
    reservation = await reserveCompute(user.id, 'export', parseComputeConfirmation(body), provider);
    
    const result = await distributeContent(user.id, provider, videoUrl, caption || "", metadata);
    await settleCompute(user.id, reservation, 'completed');
    return NextResponse.json(result);
  } catch (e: any) {
    console.error(`[Export ${provider} Error]`, e);
    if (reservation) await settleCompute(user.id, reservation, 'refunded');
    const creditError = computeErrorResponse(e);
    return creditError ?? NextResponse.json({ error: 'Publishing could not finish. Please check your account connection and try again.' }, { status: 502 });
  }
}
