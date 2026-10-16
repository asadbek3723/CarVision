import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { createServerSupabaseClient, createAdminClient } from '@/lib/supabase/server';
import { validateAngleForParts, type CategorySlot } from '@/domain/angle-validator';
import { getAiImageProvider } from '@/server/providers/ai';

const createGenerationSchema = z.object({
  sessionId: z.string().uuid(),
  angleId: z.number().int().min(1).max(8),
  buildItems: z.array(z.object({
    inventoryId: z.string().uuid(),
    slot: z.enum([
      'WHEELS_RIMS', 'FRONT_BUMPER', 'REAR_BUMPER', 'REAR_DIFFUSER',
      'SIDE_SKIRTS', 'HEADLIGHTS', 'TAILLIGHTS', 'HOOD',
      'TRUNK_SPOILER', 'BODY_COLOR', 'WINDOW_TINT', 'POLISH_COAT',
    ]),
    options: z.object({
      paintHexColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
      finishStyle: z.enum(['GLOSS', 'SATIN', 'MATTE', 'METALLIC']).optional(),
      tintVltPercent: z.enum(['5', '15', '35', '70']).optional(),
      rimDiameterInches: z.number().int().min(15).max(24).optional(),
    }).optional(),
  })).min(1).max(8),
  isNightMode: z.boolean().default(false),
  idempotencyKey: z.string().uuid(),
}).strict();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = createGenerationSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_FAILED',
            messageKey: 'errors.validation.invalid_input',
            details: validated.error.flatten(),
          },
          meta: { requestId: crypto.randomUUID(), timestamp: new Date().toISOString() },
        },
        { status: 400 }
      );
    }

    const { sessionId, angleId, buildItems, isNightMode, idempotencyKey } = validated.data;

    // 1. Validate angle compatibility against selected parts
    const slots = buildItems.map((item) => item.slot as CategorySlot);
    const angleCheck = validateAngleForParts(angleId, slots);

    if (!angleCheck.isCompatible) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'ANGLE_INCOMPATIBLE',
            messageKey: 'errors.angle.incompatible',
            details: {
              recommendedAngleId: angleCheck.recommendedAngleId,
              incompatibleSlots: angleCheck.incompatibleSlots,
            },
          },
          meta: { requestId: crypto.randomUUID(), timestamp: new Date().toISOString() },
        },
        { status: 400 }
      );
    }

    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    // In dev / unauthenticated demo mode, fallback to anonymous profile
    const userId = user?.id ?? '00000000-0000-0000-0000-000000000001';

    // 2. Fetch session and angle photo
    const { data: session } = await supabase
      .from('car_sessions')
      .select('id, shop_id')
      .eq('id', sessionId)
      .single();

    const generationId = crypto.randomUUID();

    // 3. Atomically reserve 1 credit in database
    const adminSupabase = createAdminClient();
    const { data: reserveResult, error: reserveError } = await adminSupabase.rpc('reserve_credits', {
      p_user_id: userId,
      p_shop_id: session?.shop_id ?? null,
      p_amount: 1,
      p_generation_id: generationId,
    });

    if (reserveError || (reserveResult && !reserveResult.success)) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'CREDITS_INSUFFICIENT',
            messageKey: 'errors.credits.insufficient',
          },
          meta: { requestId: crypto.randomUUID(), timestamp: new Date().toISOString() },
        },
        { status: 402 }
      );
    }

    // 4. Create generation record in database
    await adminSupabase.from('generations').insert({
      id: generationId,
      session_id: sessionId,
      angle_id: angleId,
      user_id: userId,
      shop_id: session?.shop_id ?? null,
      status: 'QUEUED',
      is_night_mode: isNightMode,
      credits_charged: 1,
      idempotency_key: idempotencyKey,
    });

    // 5. Submit job to AI Image Provider
    const aiProvider = getAiImageProvider();
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const webhookUrl = `${appUrl}/api/v1/webhooks/fal`;

    const job = await aiProvider.queueInpainting({
      generationId,
      originalImageUrl: `https://cdn.carvision.app/originals/${sessionId}/angle-${angleId}.webp`,
      angleId,
      items: buildItems.map((b) => ({
        slot: b.slot,
        referenceImageUrl: `https://cdn.carvision.app/catalog/${b.inventoryId}.webp`,
        paintHexColor: b.options?.paintHexColor,
        finishStyle: b.options?.finishStyle,
        tintVltPercent: b.options?.tintVltPercent,
      })),
      isNightMode,
      webhookUrl,
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          generationId,
          status: job.status,
          creditsCharged: 1,
          estimatedWaitSeconds: job.estimatedWaitSeconds,
          realtimeChannel: `generations:${generationId}`,
        },
        meta: { requestId: crypto.randomUUID(), timestamp: new Date().toISOString() },
      },
      { status: 202 }
    );
  } catch (error) {
    console.error('Generation dispatch error:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          messageKey: 'errors.common.server_error',
        },
        meta: { requestId: crypto.randomUUID(), timestamp: new Date().toISOString() },
      },
      { status: 500 }
    );
  }
}
