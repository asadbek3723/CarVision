import { NextResponse, type NextRequest } from 'next/server';
import crypto from 'node:crypto';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/server';
import { getSession, type Session } from '@/server/auth/session';
import {
  executeDirectAiFitment,
  hasAiProvider,
  resolveImageToDataUri,
  type FitmentPartInput,
} from '@/server/providers/ai/direct-fitment-engine';
import { persistGenerationImage } from '@/server/storage';

export const maxDuration = 60;

const GENERATION_COST = 1;
const MAX_PHOTO_CHARS = 6_000_000;
const MAX_PER_MINUTE = 6;
const MAX_IN_FLIGHT = 3;

const short = (max: number) => z.string().trim().max(max);

const partInputSchema = z.object({
  id: short(80).min(1),
  name: short(200).min(1),
  category: short(80).min(1),
  spec: short(200).optional(),
  image: short(2000).optional(),
  angleImage: short(2000).optional(),
  swatch: short(40).optional(),
});

const requestSchema = z.object({
  photo: z.string().min(5).max(MAX_PHOTO_CHARS),
  angleId: short(40).optional(),
  partId: short(80).min(1),
  partName: short(400).min(1),
  partCategory: short(80).min(1),
  partSpec: short(200).optional(),
  partImage: short(2000).optional(),
  partAngleImage: short(2000).optional(),
  partPrice: z.number().nonnegative().max(10_000_000).optional(),
  swatchColor: short(40).optional(),
  parts: z.array(partInputSchema).max(8).optional(),
  idempotencyKey: z.string().uuid().optional(),
});

const meta = () => ({ requestId: crypto.randomUUID(), timestamp: new Date().toISOString() });

function errorResponse(status: number, code: string, error: string, extra: Record<string, unknown> = {}) {
  return NextResponse.json({ success: false, code, error, ...extra, meta: meta() }, { status });
}

function sha256(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}

/** Stable key: same owner + same photo + same parts + same angle => reuse the stored render (free). */
function buildCacheKey(photo: string, angleId: string, parts: FitmentPartInput[]): string {
  const normalized = parts
    .map((p) => `${p.id}|${p.category}|${p.spec ?? ''}|${p.swatch ?? ''}`)
    .sort()
    .join(';');
  return sha256(`${sha256(photo)}:${angleId}:${normalized}`);
}

interface GenerationPayload {
  id: string;
  beforeImageUrl: string;
  afterImageUrl: string;
  liveApiActive: boolean;
  providerUsed: string;
  part: {
    id: string;
    name: string;
    category: string;
    spec: string;
    price: number;
    depositUSD: number;
    swatch: string | null;
  };
  creditsCharged: number;
  creditsRemaining: number;
  status: 'COMPLETED';
  cached?: boolean;
  demo?: boolean;
  resolution: string;
  durationSeconds: number;
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return errorResponse(401, 'UNAUTHENTICATED', 'Rasm yaratish uchun tizimga kiring');
  }

  let reserved: { generationId: string } | null = null;
  const db = createAdminClient();

  try {
    const parsed = requestSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return errorResponse(400, 'VALIDATION_FAILED', "Ma'lumotlar noto'g'ri kiritildi", {
        details: parsed.error.flatten(),
      });
    }
    const input = parsed.data;

    const fitmentParts: FitmentPartInput[] =
      input.parts && input.parts.length > 0
        ? input.parts
        : [
            {
              id: input.partId,
              name: input.partName,
              category: input.partCategory,
              spec: input.partSpec,
              image: input.partImage,
              angleImage: input.partAngleImage,
              swatch: input.swatchColor,
            },
          ];

    // The car photo must be a real, valid image. No default/demo photo is accepted.
    if (!(await resolveImageToDataUri(input.photo))) {
      return errorResponse(400, 'INVALID_IMAGE', "Avtomobil fotosurati yuklanishi shart (JPEG/PNG/WebP, 10MB gacha)");
    }

    const angleKey = input.angleId || 'front-left';
    const priceUSD = input.partPrice ?? 0;
    const partPayload = {
      id: input.partId,
      name: input.partName,
      category: input.partCategory,
      spec: input.partSpec || '',
      price: priceUSD,
      depositUSD: Math.round(priceUSD * 0.03),
      swatch: input.swatchColor ?? null,
    };
    const currentBalance = session.shop ? session.shop.credits_balance : session.profile.credits_balance;

    // ---- Demo mode: no AI key configured yet. Nothing is charged or stored. -----------------
    if (!hasAiProvider()) {
      const payload: GenerationPayload = {
        id: crypto.randomUUID(),
        beforeImageUrl: input.photo,
        afterImageUrl: '/images/studio/studio_coupe_tuned.jpg',
        liveApiActive: false,
        providerUsed: 'demo',
        part: partPayload,
        creditsCharged: 0,
        creditsRemaining: currentBalance,
        status: 'COMPLETED',
        demo: true,
        resolution: 'demo',
        durationSeconds: 0,
      };
      return NextResponse.json({ success: true, generation: payload, meta: meta() });
    }

    const cacheKey = buildCacheKey(input.photo, angleKey, fitmentParts);

    // ---- Idempotent retry of the same request ----------------------------------------------
    if (input.idempotencyKey) {
      const { data: dup } = await db
        .from('generations')
        .select('id, status, output_4k_url, preview_url, provider, credits_charged')
        .eq('idempotency_key', input.idempotencyKey)
        .eq('user_id', session.userId)
        .maybeSingle();
      if (dup) {
        if (dup.status === 'COMPLETED' && dup.output_4k_url) {
          return NextResponse.json({
            success: true,
            generation: cachedPayload(dup.id as string, input.photo, dup.output_4k_url as string, partPayload, currentBalance, (dup.provider as string) || 'cache'),
            meta: meta(),
          });
        }
        return errorResponse(409, 'IN_PROGRESS', "Bu so'rov allaqachon bajarilmoqda");
      }
    }

    // ---- Cache: identical render already paid for => free ----------------------------------
    const { data: hit } = await db
      .from('generations')
      .select('id, output_4k_url, provider')
      .eq('user_id', session.userId)
      .eq('cache_key', cacheKey)
      .eq('status', 'COMPLETED')
      .not('output_4k_url', 'is', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (hit?.output_4k_url) {
      return NextResponse.json({
        success: true,
        generation: cachedPayload(hit.id as string, input.photo, hit.output_4k_url as string, partPayload, currentBalance, (hit.provider as string) || 'cache'),
        meta: meta(),
      });
    }

    // ---- Abuse limits ----------------------------------------------------------------------
    const [{ count: lastMinute }, { count: inFlight }] = await Promise.all([
      db
        .from('generations')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', session.userId)
        .gte('created_at', new Date(Date.now() - 60_000).toISOString()),
      db
        .from('generations')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', session.userId)
        .eq('status', 'PROCESSING')
        .gte('created_at', new Date(Date.now() - 5 * 60_000).toISOString()),
    ]);
    if ((lastMinute ?? 0) >= MAX_PER_MINUTE || (inFlight ?? 0) >= MAX_IN_FLIGHT) {
      return errorResponse(429, 'RATE_LIMITED', "Juda tez-tez so'rov. Bir oz kutib qayta urinib ko'ring");
    }

    // ---- Reserve credit atomically BEFORE calling the paid provider ------------------------
    const generationId = crypto.randomUUID();
    const { error: insertErr } = await db.from('generations').insert({
      id: generationId,
      user_id: session.userId,
      shop_id: session.shop?.id ?? null,
      status: 'PROCESSING',
      angle_key: angleKey,
      cache_key: cacheKey,
      parts: fitmentParts.map((p) => ({ id: p.id, name: p.name, category: p.category })),
      credits_charged: GENERATION_COST,
      idempotency_key: input.idempotencyKey ?? crypto.randomUUID(),
    });
    if (insertErr) {
      console.error('generation insert failed:', insertErr.message);
      return errorResponse(500, 'INTERNAL_SERVER_ERROR', 'Serverda xatolik yuz berdi');
    }

    const { data: reserve, error: reserveErr } = await db.rpc('reserve_credits', {
      p_user_id: session.userId,
      p_shop_id: session.shop?.id ?? null,
      p_amount: GENERATION_COST,
      p_generation_id: generationId,
    });
    const reserveResult = reserve as { success?: boolean; error?: string; balanceAfter?: number; currentBalance?: number } | null;
    if (reserveErr || !reserveResult?.success) {
      await db.from('generations').delete().eq('id', generationId);
      if (reserveResult?.error === 'INSUFFICIENT_CREDITS') {
        return errorResponse(402, 'INSUFFICIENT_CREDITS', "Kreditlar tugadi. Tarifni yangilang", {
          creditsRemaining: reserveResult.currentBalance ?? 0,
        });
      }
      if (reserveResult?.error === 'PLAN_EXPIRED') {
        return errorResponse(402, 'PLAN_EXPIRED', "Tarif muddati tugagan. Tarifni yangilang");
      }
      if (reserveResult?.error === 'ACCOUNT_BLOCKED') {
        return errorResponse(403, 'ACCOUNT_BLOCKED', 'Akkaunt bloklangan');
      }
      if (reserveErr) console.error('reserve_credits failed:', reserveErr.message);
      return errorResponse(500, 'INTERNAL_SERVER_ERROR', 'Serverda xatolik yuz berdi');
    }
    reserved = { generationId };
    const balanceAfter = reserveResult.balanceAfter ?? currentBalance - GENERATION_COST;

    // ---- Render ----------------------------------------------------------------------------
    const ai = await executeDirectAiFitment({
      carPhoto: input.photo,
      angleId: angleKey,
      parts: fitmentParts,
      mode: 'fitment',
    });

    if (!ai.afterImageUrl) {
      await refund(db, session, generationId, ai.outcome === 'invalid_image' ? 'Invalid input image' : 'AI provider failed');
      reserved = null;
      return errorResponse(502, 'AI_FAILED', "Rasm yaratib bo'lmadi. Kredit qaytarildi, qayta urinib ko'ring", {
        creditsRemaining: currentBalance,
      });
    }

    const storedUrl = await persistGenerationImage(session.userId, generationId, ai.afterImageUrl);
    const finalUrl = storedUrl ?? ai.afterImageUrl;

    await db
      .from('generations')
      .update({
        status: 'COMPLETED',
        output_4k_url: finalUrl,
        preview_url: finalUrl,
        provider: ai.providerUsed,
        prompt: ai.promptUsed,
        duration_ms: ai.durationMs,
        completed_at: new Date().toISOString(),
      })
      .eq('id', generationId);

    await db.rpc('commit_credits', {
      p_user_id: session.userId,
      p_shop_id: session.shop?.id ?? null,
      p_amount: GENERATION_COST,
      p_generation_id: generationId,
    });
    reserved = null;

    const payload: GenerationPayload = {
      id: generationId,
      beforeImageUrl: input.photo,
      afterImageUrl: finalUrl,
      liveApiActive: true,
      providerUsed: ai.providerUsed,
      part: partPayload,
      creditsCharged: GENERATION_COST,
      creditsRemaining: balanceAfter,
      status: 'COMPLETED',
      resolution: 'AI render',
      durationSeconds: Number((ai.durationMs / 1000).toFixed(2)),
    };
    return NextResponse.json({ success: true, generation: payload, meta: meta() });
  } catch (error) {
    console.error('Generation error:', error);
    if (reserved) {
      await refund(db, session, reserved.generationId, 'Unexpected server error').catch(() => undefined);
    }
    return errorResponse(500, 'INTERNAL_SERVER_ERROR', 'Serverda xatolik yuz berdi. Kredit qaytarildi');
  }
}

function cachedPayload(
  id: string,
  beforeUrl: string,
  afterUrl: string,
  part: GenerationPayload['part'],
  balance: number,
  provider: string
): GenerationPayload {
  return {
    id,
    beforeImageUrl: beforeUrl,
    afterImageUrl: afterUrl,
    liveApiActive: true,
    providerUsed: provider,
    part,
    creditsCharged: 0,
    creditsRemaining: balance,
    status: 'COMPLETED',
    cached: true,
    resolution: 'AI render',
    durationSeconds: 0,
  };
}

async function refund(db: ReturnType<typeof createAdminClient>, session: Session, generationId: string, reason: string) {
  await db.from('generations').update({ status: 'FAILED', error_message: reason }).eq('id', generationId);
  await db.rpc('rollback_credits', {
    p_user_id: session.userId,
    p_shop_id: session.shop?.id ?? null,
    p_amount: GENERATION_COST,
    p_generation_id: generationId,
  });
}

/** The signed-in user's own recent renders (never other users' data). */
export async function GET() {
  const session = await getSession();
  if (!session) return errorResponse(401, 'UNAUTHENTICATED', 'Kirish talab qilinadi');

  const { data, error } = await createAdminClient()
    .from('generations')
    .select('id, status, output_4k_url, provider, angle_key, credits_charged, created_at')
    .eq('user_id', session.userId)
    .order('created_at', { ascending: false })
    .limit(20);
  if (error) return errorResponse(500, 'INTERNAL_SERVER_ERROR', 'Serverda xatolik yuz berdi');
  return NextResponse.json({ success: true, generations: data ?? [] });
}
