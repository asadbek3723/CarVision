import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/server';
import { requireUser } from '@/server/auth/guards';
import { isMissingRelation } from '@/server/catalog';

export const dynamic = 'force-dynamic';

const MAX_LINES = 200;
const itemId = z.string().min(1).max(64).regex(/^[A-Za-z0-9_-]+$/);

const cartSchema = z.object({
  items: z
    .record(itemId, z.number().int().min(1).max(999))
    .refine((r) => Object.keys(r).length <= MAX_LINES, 'Too many lines'),
  unselected: z.array(itemId).max(MAX_LINES),
});

const fail = (status: number, code: string, error: string) => NextResponse.json({ success: false, code, error }, { status });

/** Until supabase/migrations/20261121000000_user_carts.sql is applied the cart stays on the device. */
function storeError(error: { code?: string; message?: string }, what: string) {
  if (isMissingRelation(error)) return fail(503, 'CART_SYNC_UNAVAILABLE', 'Savatcha hozircha faqat shu qurilmada');
  console.error(`cart ${what} failed:`, error.message);
  return fail(500, 'INTERNAL', 'Server error');
}

/** The signed-in user's saved cart (empty when nothing was saved yet). */
export async function GET() {
  const guard = await requireUser();
  if (!guard.ok) return guard.response;
  const { data, error } = await createAdminClient()
    .from('user_carts')
    .select('items, unselected, updated_at')
    .eq('user_id', guard.value.userId)
    .maybeSingle();
  if (error) return storeError(error, 'read');
  const parsed = cartSchema.safeParse({ items: data?.items ?? {}, unselected: data?.unselected ?? [] });
  const cart = parsed.success ? parsed.data : { items: {}, unselected: [] };
  return NextResponse.json(
    { success: true, cart: { ...cart, updatedAt: (data?.updated_at as string | undefined) ?? null } },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}

/** Replaces the signed-in user's saved cart with the one this device has. */
export async function PUT(request: NextRequest) {
  const guard = await requireUser();
  if (!guard.ok) return guard.response;
  const parsed = cartSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail(400, 'INVALID_INPUT', 'Savatcha ma’lumoti noto‘g‘ri');
  const { items, unselected } = parsed.data;
  const updatedAt = new Date().toISOString();
  const { error } = await createAdminClient()
    .from('user_carts')
    .upsert(
      { user_id: guard.value.userId, items, unselected: unselected.filter((id) => id in items), updated_at: updatedAt },
      { onConflict: 'user_id' }
    );
  if (error) return storeError(error, 'save');
  return NextResponse.json({ success: true, updatedAt });
}
