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
import { visibleParts } from '@/lib/part-visibility';
import { carCheckRequired, verifyCarCheck } from '@/server/car-check';

export const maxDuration = 60;

const GENERATION_COST = 1;
// Vercel rejects request bodies over ~4.5MB before our code runs, so a bigger limit here would be a lie.
const MAX_PHOTO_CHARS = 4_200_000;
/**
 * The function is killed at maxDuration (60s). The provider chain stops at 44s; this is the outer
 * guard, and the remaining seconds are for storing the picture (a 2K PNG is several MB) and
 * settling the credit, so a render is never lost half-way.
 */
const AI_TIMEOUT_MS = 47_000;
/** What the provider chain may use, counted from the start of the call (loading the photos included). */
const AI_CHAIN_DEADLINE_MS = 44_000;
/** Without storage a picture can only travel inside the JSON answer, and platforms cap that at ~4.5 MB. */
const MAX_INLINE_RESULT_CHARS = 3_000_000;
/**
 * A PROCESSING row older than this belongs to a request that died (the function is killed at 60s):
 * its credit must go back. Kept close to maxDuration so a customer is not left waiting for it.
 */
const STALE_AFTER_MS = 90_000;
/** A full 5-angle render plus a couple of retries of failed angles must fit in one minute. */
const MAX_PER_MINUTE = 10;
const MAX_IN_FLIGHT = 3;

const short = (max: number) => z.string().trim().max(max);
/** Descriptive text only feeds the prompt: shorten it instead of rejecting the whole render. */
const clip = (max: number) => z.string().trim().transform((v) => v.slice(0, max));

const partInputSchema = z.object({
  id: short(80).min(1),
  name: clip(200).pipe(z.string().min(1)),
  category: short(80).min(1),
  spec: clip(200).optional(),
  image: short(2000).optional(),
  angleImage: short(2000).optional(),
  swatch: short(40).optional(),
  /** Front / rear position of a light, bumper or body part (decides which photos can show it). */
  zone: short(10).optional(),
});

const carCheckTokenSchema = short(200).optional();

const requestSchema = z.object({
  photo: z.string().min(5).max(MAX_PHOTO_CHARS),
  angleId: short(40).optional(),
  /**
   * The side the photo really shows, as the AI car check saw it (`front`, `rear`, `right`, ...).
   * Decides which parts can be seen and how the AI is told about the camera; `angleId` stays the
   * slot the photo was taken for.
   */
  view: z.enum(['front', 'front-left', 'left', 'rear-left', 'rear', 'rear-right', 'right', 'front-right']).optional(),
  partId: short(80).min(1),
  partName: clip(400).pipe(z.string().min(1)),
  partCategory: short(80).min(1),
  partSpec: clip(200).optional(),
  partImage: short(2000).optional(),
  partAngleImage: short(2000).optional(),
  partPrice: z.number().nonnegative().max(10_000_000).optional(),
  swatchColor: short(40).optional(),
  parts: z.array(partInputSchema).max(12).optional(),
  idempotencyKey: z.string().uuid().optional(),
  /** Proof from /api/v1/vehicles/detect that the photos were checked (required when CAR_CHECK_SECRET is set). */
  carCheckToken: carCheckTokenSchema,
  /** Finished render of the same build from another angle (consistency reference). */
  referenceAfterUrl: short(2000).optional(),
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
  afterImageUrl: string;
  liveApiActive: boolean;
  providerUsed: string;
  part: {
    id: string;
    name: string;
    category: string;
    spec: string;
    price: number;
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
    // Give back credits of this user's earlier renders that were killed mid-flight (timeout / crash).
    await refundStale(db, session).catch((e) => console.error('stale refund failed:', e));

    const parsed = requestSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      console.warn('generations: validation failed:', JSON.stringify(parsed.error.flatten().fieldErrors));
      return errorResponse(400, 'VALIDATION_FAILED', "Ma'lumotlar noto'g'ri kiritildi", {
        details: parsed.error.flatten(),
      });
    }
    const input = parsed.data;

    const requestedParts: Array<FitmentPartInput & { zone?: string | undefined }> =
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

    const angleKey = input.view || input.angleId || 'front-left';

    // A part that cannot be seen from this side (rear light on a front photo, spoiler on the front)
    // is not rendered and not charged: stops direct API calls from paying for an invisible part.
    const fitmentParts = visibleParts(requestedParts, angleKey);
    if (fitmentParts.length === 0) {
      return errorResponse(422, 'PART_NOT_VISIBLE', "Tanlangan detal bu rakursda ko'rinmaydi. Kredit yechilmadi", {
        creditsRemaining: session.shop ? session.shop.credits_balance : session.profile.credits_balance,
      });
    }
    const priceUSD = input.partPrice ?? 0;
    const partPayload = {
      id: input.partId,
      name: input.partName,
      category: input.partCategory,
      spec: input.partSpec || '',
      price: priceUSD,
      swatch: input.swatchColor ?? null,
    };
    const currentBalance = session.shop ? session.shop.credits_balance : session.profile.credits_balance;

    // ---- Demo mode: no AI key configured yet. Nothing is charged or stored. -----------------
    if (!hasAiProvider()) {
      const payload: GenerationPayload = {
        id: crypto.randomUUID(),
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

    // Photos must have passed the car check ("it is a car, all sides are one car") before any credit
    // is reserved. Only enforced when CAR_CHECK_SECRET is configured.
    if (carCheckRequired() && !verifyCarCheck(input.carCheckToken, session.userId)) {
      return errorResponse(403, 'CAR_NOT_VERIFIED', 'Mashina tasdiqlanmagan. Rasmlarni qayta tasdiqlang. Kredit yechilmadi', {
        creditsRemaining: currentBalance,
      });
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
            generation: cachedPayload(dup.id as string, dup.output_4k_url as string, partPayload, currentBalance, (dup.provider as string) || 'cache'),
            meta: meta(),
          });
        }
        // A failed attempt was refunded; it is finished, not "in progress". The key cannot be reused
        // (it is stored on that row), so the client must send the retry with a new key.
        if (dup.status === 'FAILED') {
          return errorResponse(409, 'IDEMPOTENCY_KEY_USED', "Bu so'rov avval muvaffaqiyatsiz tugagan, kredit qaytarilgan. Qayta urinib ko'ring", {
            creditsRemaining: currentBalance,
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
        generation: cachedPayload(hit.id as string, hit.output_4k_url as string, partPayload, currentBalance, (hit.provider as string) || 'cache'),
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
      if (reserveErr) {
        // A transport error may hide a reservation that did commit: never delete the row (that would
        // orphan the ledger entry). Mark it failed and try to give the credit back; the stale sweep retries.
        await refund(db, session, generationId, 'Reservation error').catch(() => undefined);
      } else {
        await db.from('generations').delete().eq('id', generationId);
      }
      if (reserveResult?.error === 'INSUFFICIENT_CREDITS') {
        return errorResponse(402, 'INSUFFICIENT_CREDITS', "Kreditlar tugadi. Tarifni yangilang", {
          creditsRemaining: reserveResult.currentBalance ?? 0,
        });
      }
      if (reserveResult?.error === 'PLAN_EXPIRED') {
        return errorResponse(402, 'PLAN_EXPIRED', "Tarif muddati tugagan. Tarifni yangilang");
      }
      if (reserveResult?.error === 'TOO_MANY_IN_FLIGHT') {
        return errorResponse(429, 'RATE_LIMITED', "Juda tez-tez so'rov. Bir oz kutib qayta urinib ko'ring");
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
    const aiRun = executeDirectAiFitment({
      carPhoto: input.photo,
      angleId: angleKey,
      parts: fitmentParts,
      referenceAfter: input.referenceAfterUrl,
      deadlineMs: AI_CHAIN_DEADLINE_MS,
    });
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timedOut = new Promise<'timeout'>((resolve) => {
      timer = setTimeout(() => resolve('timeout'), AI_TIMEOUT_MS);
    });
    const raced = await Promise.race([aiRun, timedOut]);
    clearTimeout(timer);
    if (raced === 'timeout') {
      aiRun.catch(() => undefined); // late result is discarded; the credit goes back now
      await refund(db, session, generationId, 'AI provider timed out');
      reserved = null;
      return errorResponse(504, 'AI_TIMEOUT', "Rasm yaratish juda uzoq davom etdi. Kredit qaytarildi, qayta urinib ko'ring", {
        creditsRemaining: currentBalance,
      });
    }
    const ai = raced;

    if (!ai.afterImageUrl) {
      await refund(
        db,
        session,
        generationId,
        ai.outcome === 'invalid_image' ? 'Invalid input image' : ai.outcome === 'wrong_view' ? 'AI result showed another side of the car' : 'AI provider failed'
      );
      reserved = null;
      if (ai.outcome === 'no_quota') {
        return errorResponse(503, 'AI_NO_QUOTA', "AI kalitida rasm yaratish limiti yo'q (to'lov/billing yoqilmagan). Kredit qaytarildi", {
          creditsRemaining: currentBalance,
        });
      }
      if (ai.outcome === 'blocked') {
        return errorResponse(422, 'AI_BLOCKED', "AI bu suratni qayta ishlay olmadi (xavfsizlik filtri). Kredit qaytarildi", {
          creditsRemaining: currentBalance,
        });
      }
      if (ai.outcome === 'wrong_view') {
        return errorResponse(502, 'AI_WRONG_VIEW', "AI natijasi mashinaning boshqa tomonini ko'rsatdi, shuning uchun berilmadi. Kredit qaytarildi, qayta urinib ko'ring", {
          creditsRemaining: currentBalance,
        });
      }
      if (ai.outcome === 'busy') {
        return errorResponse(503, 'AI_BUSY', "Hozir so'rovlar ko'p, barcha AI modellar band. Kredit qaytarildi, 1-2 daqiqadan keyin qayta urinib ko'ring", {
          creditsRemaining: currentBalance,
        });
      }
      return errorResponse(502, 'AI_FAILED', "Rasm yaratib bo'lmadi. Kredit qaytarildi, qayta urinib ko'ring", {
        creditsRemaining: currentBalance,
      });
    }

    const stored = await persistGenerationImage(session.userId, generationId, ai.afterImageUrl);
    if (!stored.ok && stored.reason === 'invalid') {
      // The provider answered with something that is not a picture: never show it, never charge for it.
      await refund(db, session, generationId, 'AI answer was not a valid image');
      reserved = null;
      return errorResponse(502, 'AI_FAILED', "Rasm yaratib bo'lmadi. Kredit qaytarildi, qayta urinib ko'ring", {
        creditsRemaining: currentBalance,
      });
    }
    if (!stored.ok && ai.afterImageUrl.startsWith('data:') && ai.afterImageUrl.length > MAX_INLINE_RESULT_CHARS) {
      // Storage is down and the picture is too big to send back inside the answer: do not charge for what cannot be delivered.
      await refund(db, session, generationId, 'Result could not be stored');
      reserved = null;
      return errorResponse(503, 'AI_STORAGE_FAILED', "Natijani saqlab bo'lmadi. Kredit qaytarildi, qayta urinib ko'ring", {
        creditsRemaining: currentBalance,
      });
    }
    const finalUrl = stored.ok ? stored.url : ai.afterImageUrl;

    // Settle the credit FIRST. If a parallel stale sweep already refunded this render, the customer
    // must not get the picture for free: report a timeout instead (the credit is already back).
    const { data: commitData, error: commitErr } = await db.rpc('commit_credits', {
      p_user_id: session.userId,
      p_shop_id: session.shop?.id ?? null,
      p_amount: GENERATION_COST,
      p_generation_id: generationId,
    });
    const commit = commitData as { success?: boolean; error?: string; state?: string } | null;
    if (!commitErr && commit && !commit.success && commit.state === 'REFUNDED') {
      reserved = null;
      return errorResponse(504, 'AI_TIMEOUT', "Rasm yaratish juda uzoq davom etdi. Kredit qaytarildi, qayta urinib ko'ring", {
        creditsRemaining: currentBalance,
      });
    }
    // A failed bookkeeping call must not turn into a failed render: the row stays RESERVED and COMPLETED,
    // which the admin stats flag, and is never refunded by the stale sweep.
    if (commitErr) console.error('commit_credits failed:', commitErr.message);

    const completed = {
      status: 'COMPLETED',
      output_4k_url: finalUrl,
      preview_url: finalUrl,
      provider: ai.modelUsed ? `${ai.providerUsed}:${ai.modelUsed}`.slice(0, 120) : ai.providerUsed,
      prompt: ai.promptUsed,
      duration_ms: ai.durationMs,
      completed_at: new Date().toISOString(),
    };
    let updateErr = (await db.from('generations').update(completed).eq('id', generationId)).error;
    if (updateErr) updateErr = (await db.from('generations').update(completed).eq('id', generationId)).error;
    if (updateErr) console.error('generation update failed:', updateErr.message);
    reserved = null;

    const payload: GenerationPayload = {
      id: generationId,
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
  afterUrl: string,
  part: GenerationPayload['part'],
  balance: number,
  provider: string
): GenerationPayload {
  return {
    id,
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

/**
 * Gives the credit back, then marks the render failed. A render whose credit was already committed
 * (delivered) is never marked failed. If the refund call itself fails, the row keeps
 * credit_state = RESERVED and the stale sweep retries it later, so the credit is never lost.
 */
async function refund(db: ReturnType<typeof createAdminClient>, session: Session, generationId: string, reason: string) {
  const { error } = await db.rpc('rollback_credits', {
    p_user_id: session.userId,
    p_shop_id: session.shop?.id ?? null,
    p_amount: GENERATION_COST,
    p_generation_id: generationId,
  });
  if (error) console.error('rollback_credits failed (will retry):', error.message);
  await db.from('generations').update({ status: 'FAILED', error_message: reason }).eq('id', generationId).neq('credit_state', 'COMMITTED');
}

/** Refunds this user's PROCESSING renders that outlived the function's time limit. Idempotent. */
async function refundStale(db: ReturnType<typeof createAdminClient>, session: Session) {
  const { data } = await db
    .from('generations')
    .select('id')
    .eq('user_id', session.userId)
    // Interrupted renders, and failed ones whose refund call did not go through.
    .eq('credit_state', 'RESERVED')
    .in('status', ['PROCESSING', 'FAILED'])
    .lt('created_at', new Date(Date.now() - STALE_AFTER_MS).toISOString())
    .limit(20);
  for (const row of data ?? []) {
    await refund(db, session, row.id as string, 'Request interrupted (timeout)').catch(() => undefined);
  }
}

/** The signed-in user's own recent renders (never other users' data). */
export async function GET() {
  const session = await getSession();
  if (!session) return errorResponse(401, 'UNAUTHENTICATED', 'Kirish talab qilinadi');

  // Opening the list also gives back the credit of any render that was killed mid-flight.
  await refundStale(createAdminClient(), session).catch(() => undefined);

  const { data, error } = await createAdminClient()
    .from('generations')
    .select('id, status, output_4k_url, provider, angle_key, credits_charged, created_at')
    .eq('user_id', session.userId)
    .order('created_at', { ascending: false })
    .limit(20);
  if (error) return errorResponse(500, 'INTERNAL_SERVER_ERROR', 'Serverda xatolik yuz berdi');
  return NextResponse.json({ success: true, generations: data ?? [] });
}
