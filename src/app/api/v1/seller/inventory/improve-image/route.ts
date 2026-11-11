import { NextResponse, type NextRequest } from 'next/server';
import crypto from 'node:crypto';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/server';
import { requirePaidSeller } from '@/server/auth/guards';
import { isOwnShopImage } from '@/server/catalog';

export const maxDuration = 60;

const COST = 1;
const schema = z.object({ imageUrl: z.string().url() });

const fail = (status: number, code: string, error: string, extra: Record<string, unknown> = {}) =>
  NextResponse.json({ success: false, code, error, ...extra }, { status });

/**
 * Isolates the product from its background (cut-out) with Fal BiRefNet. Pixels of the
 * product itself are never regenerated, so the design cannot change. The browser then
 * places the cut-out on a studio background and uploads the result.
 * Costs 1 credit, refunded automatically if the provider fails.
 */
export async function POST(request: NextRequest) {
  const guard = await requirePaidSeller();
  if (!guard.ok) return guard.response;
  const { session, shopId } = guard.value;

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail(400, 'INVALID_INPUT', 'Rasm manzili noto‘g‘ri');
  if (!isOwnShopImage(parsed.data.imageUrl, shopId)) {
    return fail(400, 'INVALID_IMAGE', 'Avval rasmni yuklang');
  }

  const falKey = (process.env.FAL_KEY || process.env.FAL_API_KEY || '').trim();
  if (falKey.length <= 8) {
    return fail(503, 'AI_NOT_CONFIGURED', 'Rasmni AI bilan yaxshilash hozircha ulanmagan. Asl rasm bilan davom eting');
  }

  const db = createAdminClient();
  const generationId = crypto.randomUUID();

  const { error: insertErr } = await db.from('generations').insert({
    id: generationId,
    user_id: session.userId,
    shop_id: shopId,
    status: 'PROCESSING',
    angle_key: 'part-cutout',
    credits_charged: COST,
    idempotency_key: crypto.randomUUID(),
  });
  if (insertErr) return fail(500, 'INTERNAL', 'Serverda xatolik yuz berdi');

  // Gives the credit back first; a failed call leaves credit_state RESERVED for the stale sweep
  // (GET /api/v1/generations), so the credit is never lost. Delivered renders are never marked failed.
  const refund = async (reason: string) => {
    const { error } = await db.rpc('rollback_credits', { p_user_id: session.userId, p_shop_id: shopId, p_amount: COST, p_generation_id: generationId });
    if (error) console.error('rollback_credits failed (will retry):', error.message);
    await db.from('generations').update({ status: 'FAILED', error_message: reason }).eq('id', generationId).neq('credit_state', 'COMMITTED');
  };

  const { data: reserve, error: reserveErr } = await db.rpc('reserve_credits', {
    p_user_id: session.userId,
    p_shop_id: shopId,
    p_amount: COST,
    p_generation_id: generationId,
  });
  const r = reserve as { success?: boolean; error?: string; balanceAfter?: number; currentBalance?: number } | null;
  if (reserveErr) {
    await refund('Reservation error').catch(() => undefined);
    return fail(500, 'INTERNAL', 'Serverda xatolik yuz berdi');
  }
  if (!r?.success) {
    await db.from('generations').delete().eq('id', generationId);
    if (r?.error === 'INSUFFICIENT_CREDITS') return fail(402, 'INSUFFICIENT_CREDITS', 'Kreditlar tugadi. Tarifni yangilang');
    if (r?.error === 'PLAN_EXPIRED') return fail(402, 'PLAN_EXPIRED', 'Tarif muddati tugagan');
    return fail(500, 'INTERNAL', 'Serverda xatolik yuz berdi');
  }

  try {
    const res = await fetch('https://fal.run/fal-ai/birefnet', {
      method: 'POST',
      headers: { Authorization: `Key ${falKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ image_url: parsed.data.imageUrl, output_format: 'png' }),
      signal: AbortSignal.timeout(50_000),
    });
    const data = res.ok ? ((await res.json()) as { image?: { url?: string } }) : null;
    const url = data?.image?.url;
    if (!url) {
      await refund('Provider returned no image');
      return fail(502, 'AI_FAILED', 'Rasmni yaxshilab bo‘lmadi. Kredit qaytarildi');
    }

    const { data: c, error: commitErr } = await db.rpc('commit_credits', { p_user_id: session.userId, p_shop_id: shopId, p_amount: COST, p_generation_id: generationId });
    if (!commitErr && (c as { state?: string } | null)?.state === 'REFUNDED') {
      return fail(504, 'AI_TIMEOUT', 'Juda uzoq davom etdi. Kredit qaytarildi');
    }
    if (commitErr) console.error('commit_credits failed:', commitErr.message);
    await db.from('generations').update({ status: 'COMPLETED', output_4k_url: url, provider: 'fal-birefnet', completed_at: new Date().toISOString() }).eq('id', generationId);
    return NextResponse.json({ success: true, cutoutUrl: url, creditsRemaining: r.balanceAfter ?? 0, creditsCharged: COST });
  } catch (err) {
    console.error('improve-image error:', err);
    await refund('Unexpected error');
    return fail(502, 'AI_FAILED', 'Rasmni yaxshilab bo‘lmadi. Kredit qaytarildi');
  }
}
