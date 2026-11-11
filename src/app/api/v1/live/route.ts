import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { LISTED_ITEMS } from '@/server/catalog';

export const dynamic = 'force-dynamic';

/**
 * Tiny "what changed?" signal for the app. It returns one short token that changes whenever a
 * published part is added, edited, unpublished or removed, or the shop banner is replaced. Phones
 * poll it every few seconds while the app is on screen and re-read their lists only when the
 * token moves, so new products appear without anyone pulling to refresh.
 *
 * The answer is computed at most once per second per server instance, however many phones ask.
 */
let cached: { at: number; token: string } | null = null;
let inflight: Promise<string> | null = null;
const TTL_MS = 1000;

async function compute(): Promise<string> {
  const db = createAdminClient();
  const [latest, count, banner] = await Promise.all([
    db.from(LISTED_ITEMS).select('updated_at').eq('status', 'PUBLISHED').order('updated_at', { ascending: false }).limit(1),
    db.from(LISTED_ITEMS).select('id', { count: 'exact', head: true }).eq('status', 'PUBLISHED'),
    db.from('app_banners').select('updated_at, is_active').eq('slot', 'shop').maybeSingle(),
  ]);
  const t = latest.data?.[0]?.updated_at ? Date.parse(latest.data[0].updated_at as string) : 0;
  const b = banner.data?.updated_at ? Date.parse(banner.data.updated_at as string) : 0;
  return `${t.toString(36)}.${(count.count ?? 0).toString(36)}.${b.toString(36)}${banner.data?.is_active ? 'a' : 'o'}`;
}

export async function GET() {
  const headers = { 'Cache-Control': 'no-store, max-age=0' };
  try {
    if (!cached || Date.now() - cached.at > TTL_MS) {
      inflight ??= compute().finally(() => {
        inflight = null;
      });
      const token = await inflight;
      cached = { at: Date.now(), token };
    }
    return NextResponse.json({ success: true, v: cached.token }, { headers });
  } catch {
    // Never break the app over a missing signal: the screens still refresh on their own timer.
    return NextResponse.json({ success: false }, { status: 200, headers });
  }
}
