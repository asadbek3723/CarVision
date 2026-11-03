import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { getSession, loadSession } from '@/server/auth/session';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ success: false, code: 'UNAUTHENTICATED', error: 'Kirish talab qilinadi' }, { status: 401 });
  }
  await createAdminClient().rpc('claim_monthly_credits', { p_user_id: session.userId });
  const fresh = (await loadSession(session.userId)) ?? session;
  return NextResponse.json({ success: true, user: fresh.profile });
}
