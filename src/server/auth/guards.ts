import { NextResponse } from 'next/server';
import { getSession, type Session } from '@/server/auth/session';

type GuardResult<T> = { ok: true; value: T } | { ok: false; response: NextResponse };

function deny(status: number, code: string, error: string): { ok: false; response: NextResponse } {
  return { ok: false, response: NextResponse.json({ success: false, code, error }, { status }) };
}

/** Any signed-in, non-banned user. */
export async function requireUser(): Promise<GuardResult<Session>> {
  const session = await getSession();
  if (!session) return deny(401, 'UNAUTHENTICATED', 'Kirish talab qilinadi');
  return { ok: true, value: session };
}

/** A signed-in workshop owner. Returns the session plus the shop id every query must be scoped to. */
export async function requireSeller(): Promise<GuardResult<{ session: Session; shopId: string }>> {
  const session = await getSession();
  if (!session) return deny(401, 'UNAUTHENTICATED', 'Kirish talab qilinadi');
  if (session.role !== 'b2b_seller' || !session.shop) {
    return deny(403, 'FORBIDDEN', 'Bu amal faqat studiya egalari uchun');
  }
  return { ok: true, value: { session, shopId: session.shop.id } };
}

/** A workshop owner with an ACTIVE paid plan. Free workshops get 402 and are sent to the plans page. */
export async function requirePaidSeller(): Promise<GuardResult<{ session: Session; shopId: string }>> {
  const base = await requireSeller();
  if (!base.ok) return base;
  if (!base.value.session.plan.isPaid) {
    return {
      ok: false,
      response: NextResponse.json(
        { success: false, code: 'PLAN_REQUIRED', error: 'Bu bo‘lim pullik tarifda ochiladi. Tarifni faollashtiring' },
        { status: 402 }
      ),
    };
  }
  return base;
}
