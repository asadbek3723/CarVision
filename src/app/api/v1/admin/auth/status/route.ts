import { NextResponse, type NextRequest } from 'next/server';
import { getAdminTokenInfo, ADMIN_COOKIE_NAME } from '@/lib/admin-auth';
import { getSuperAdminId } from '@/server/auth/session';
import { isAdminTokenRevoked } from '@/server/admin';

/**
 * Whether the signed-in account is a super admin (server-set role, the same source every admin
 * check uses) and whether it already has a valid, unrevoked PIN session.
 */
export async function GET(request: NextRequest) {
  try {
    const currentAdmin = await getSuperAdminId();
    const info = getAdminTokenInfo(request.cookies.get(ADMIN_COOKIE_NAME)?.value);
    const authorized = Boolean(currentAdmin && info && info.adminId === currentAdmin && !(await isAdminTokenRevoked(info.adminId, info.issuedAt)));
    return NextResponse.json({ success: true, isSuperAdmin: Boolean(currentAdmin), isAuthorized: authorized });
  } catch (error) {
    console.error('Admin status check error:', error);
    return NextResponse.json({ success: false, isSuperAdmin: false, isAuthorized: false });
  }
}
