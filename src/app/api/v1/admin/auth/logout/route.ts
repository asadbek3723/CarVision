import { NextResponse, type NextRequest } from 'next/server';
import { ADMIN_COOKIE_NAME, getAdminTokenInfo } from '@/lib/admin-auth';
import { createAdminClient } from '@/lib/supabase/server';
import { ipOf } from '@/server/admin';

/**
 * Ends the admin session. Besides clearing the cookie, every PIN session of this admin issued until
 * now is revoked on the server, so a copied cookie stops working too.
 */
export async function POST(request: NextRequest) {
  const info = getAdminTokenInfo(request.cookies.get(ADMIN_COOKIE_NAME)?.value);
  if (info) {
    const db = createAdminClient();
    const { error } = await db
      .from('admin_session_revocations')
      .upsert({ admin_id: info.adminId, revoked_before: new Date().toISOString() }, { onConflict: 'admin_id' });
    if (error) console.error('admin session revoke failed:', error.message);
    const { error: auditErr } = await db.from('admin_audit_log').insert({
      admin_id: info.adminId,
      action: 'ADMIN_LOGOUT',
      target_entity: 'admin_session',
      ip_address: ipOf(request),
    });
    if (auditErr) console.error('logout audit failed:', auditErr.message);
  }

  const response = NextResponse.json({ success: true });
  response.cookies.set({
    name: ADMIN_COOKIE_NAME,
    value: '',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 0,
  });
  return response;
}
