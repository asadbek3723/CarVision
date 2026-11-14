import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/server';
import { requireUser } from '@/server/auth/guards';
import { FEEDBACK_REASONS } from '@/domain/render-feedback';

export const dynamic = 'force-dynamic';

const schema = z.object({
  /** The finished render's picture URL, exactly as the result page shows it. */
  url: z.string().trim().url().max(2000),
  reason: z.enum(FEEDBACK_REASONS),
  note: z
    .string()
    .trim()
    .max(500)
    .optional()
    .transform((v) => (v ? v : null)),
});

const fail = (status: number, code: string, error: string) => NextResponse.json({ success: false, code, error }, { status });

/** A missing column (`render_quality` migration not applied yet) or table. */
const missingSchema = (e: { code?: string; message?: string }) =>
  e.code === '42703' || e.code === 'PGRST204' || /column .* does not exist|could not find the .* column/i.test(e.message ?? '');

/**
 * "I don't like it" on one finished render. Only the customer's own render can be marked; sending
 * it again replaces the reason and note. No credit moves: this feeds the admin quality view.
 */
export async function POST(request: NextRequest) {
  const guard = await requireUser();
  if (!guard.ok) return guard.response;
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail(400, 'INVALID_INPUT', "Ma'lumotlar noto'g'ri");
  const { url, reason, note } = parsed.data;

  const { data, error } = await createAdminClient()
    .from('generations')
    .update({ feedback: 'bad', feedback_reason: reason, feedback_note: note, feedback_at: new Date().toISOString() })
    .eq('user_id', guard.value.userId)
    .eq('status', 'COMPLETED')
    .eq('output_4k_url', url)
    .select('id');
  if (error) {
    if (missingSchema(error)) return fail(503, 'FEEDBACK_UNAVAILABLE', 'Fikr hozircha saqlanmaydi');
    console.error('render feedback failed:', error.message);
    return fail(500, 'INTERNAL', 'Server error');
  }
  if (!data || data.length === 0) return fail(404, 'NOT_FOUND', 'Render topilmadi');
  return NextResponse.json({ success: true }, { headers: { 'Cache-Control': 'no-store' } });
}
