import { NextResponse, type NextRequest } from 'next/server';
import { timingSafeEqual } from 'node:crypto';
import { createAdminClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    // Fail closed: the webhook is unusable until a shared secret is configured.
    const expectedSecret = process.env.FAL_WEBHOOK_SECRET;
    if (!expectedSecret) {
      return NextResponse.json({ success: false, error: 'Webhook not configured' }, { status: 503 });
    }
    const provided = Buffer.from(request.headers.get('x-fal-webhook-secret') ?? '');
    const expected = Buffer.from(expectedSecret);
    if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) {
      return NextResponse.json({ success: false, error: 'Unauthorized webhook caller' }, { status: 401 });
    }

    const payload = await request.json();
    const { request_id, status, error, image, preview_image } = payload;

    if (typeof request_id !== 'string' || !/^[0-9a-fA-F-]{36}$/.test(request_id)) {
      return NextResponse.json({ received: true });
    }

    const adminSupabase = createAdminClient();

    // Find the generation record matching this job or idempotency key
    const { data: gen } = await adminSupabase
      .from('generations')
      .select('id, user_id, shop_id, credits_charged')
      .or(`id.eq.${request_id},idempotency_key.eq.${request_id}`)
      .single();

    if (!gen) {
      // Return 200 to acknowledge payload even if not found locally
      return NextResponse.json({ received: true });
    }

    if (status === 'OK' || status === 'COMPLETED' || (!status && image)) {
      // 1. Success workflow
      const output4kUrl = image?.url ?? `https://cdn.carvision.app/outputs/${gen.id}/4k.webp`;
      const previewUrl = preview_image?.url ?? `https://cdn.carvision.app/outputs/${gen.id}/preview.webp`;

      await adminSupabase
        .from('generations')
        .update({
          status: 'COMPLETED',
          output_4k_url: output4kUrl,
          preview_url: previewUrl,
          completed_at: new Date().toISOString(),
        })
        .eq('id', gen.id);

      // Permanently settle credit
      await adminSupabase.rpc('commit_credits', {
        p_user_id: gen.user_id,
        p_shop_id: gen.shop_id,
        p_amount: gen.credits_charged,
        p_generation_id: gen.id,
      });

      // Broadcast completion event via Supabase Realtime channel
      const channel = adminSupabase.channel(`generations:${gen.id}`);
      await channel.send({
        type: 'broadcast',
        event: 'GENERATION_COMPLETED',
        payload: {
          generationId: gen.id,
          status: 'COMPLETED',
          previewUrl,
          output4kUrl,
        },
      });
    } else {
      // 2. Failure workflow -> Atomic credit rollback
      await adminSupabase
        .from('generations')
        .update({
          status: 'FAILED',
          error_message: error || 'AI render failed',
        })
        .eq('id', gen.id);

      await adminSupabase.rpc('rollback_credits', {
        p_user_id: gen.user_id,
        p_shop_id: gen.shop_id,
        p_amount: gen.credits_charged,
        p_generation_id: gen.id,
      });

      const channel = adminSupabase.channel(`generations:${gen.id}`);
      await channel.send({
        type: 'broadcast',
        event: 'GENERATION_FAILED',
        payload: {
          generationId: gen.id,
          status: 'FAILED',
          messageKey: 'errors.ai.render_failed',
        },
      });
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error('Fal webhook processing error:', err);
    return NextResponse.json({ error: 'Webhook processing exception' }, { status: 500 });
  }
}
