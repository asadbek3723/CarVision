import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/server';
import { requireUser } from '@/server/auth/guards';
import { ITEM_LOCALES } from '@/domain/catalog';
import { isPushServiceEndpoint } from '@/server/push-endpoint';

export const dynamic = 'force-dynamic';

const subscribeSchema = z.object({
  subscription: z.object({
    endpoint: z.string().url().max(1000).startsWith('https://').refine(isPushServiceEndpoint, 'Unsupported push service'),
    keys: z.object({ p256dh: z.string().min(10).max(200), auth: z.string().min(10).max(100) }),
  }),
  locale: z.string().max(5).optional(),
});

/** Stores this device's push subscription for the signed-in user (one row per device). */
export async function POST(request: NextRequest) {
  const guard = await requireUser();
  if (!guard.ok) return guard.response;
  const parsed = subscribeSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ success: false, code: 'INVALID_INPUT', error: 'Invalid subscription' }, { status: 400 });
  const { subscription, locale } = parsed.data;
  const lang = locale && (ITEM_LOCALES as readonly string[]).includes(locale) ? locale : 'uz';

  const { error } = await createAdminClient()
    .from('push_subscriptions')
    .upsert(
      {
        user_id: guard.value.userId,
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
        locale: lang,
        user_agent: request.headers.get('user-agent')?.slice(0, 250) ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'endpoint' }
    );
  if (error) {
    console.error('push subscribe error:', error.message);
    return NextResponse.json({ success: false, code: 'INTERNAL', error: 'Server error' }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}

/** Removes this device's subscription (the user turned notifications off). */
export async function DELETE(request: NextRequest) {
  const guard = await requireUser();
  if (!guard.ok) return guard.response;
  const parsed = z.object({ endpoint: z.string().url().max(1000) }).safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ success: false, code: 'INVALID_INPUT', error: 'Invalid endpoint' }, { status: 400 });
  await createAdminClient().from('push_subscriptions').delete().eq('endpoint', parsed.data.endpoint).eq('user_id', guard.value.userId);
  return NextResponse.json({ success: true });
}
