import { NextResponse, type NextRequest } from 'next/server';
import { getAdminIdFromToken, ADMIN_COOKIE_NAME } from '@/lib/admin-auth';
import { getSuperAdminId } from '@/server/auth/session';

export async function GET(request: NextRequest) {
  try {
    const tokenAdmin = getAdminIdFromToken(request.cookies.get(ADMIN_COOKIE_NAME)?.value);
    // The PIN session only counts while the same account is still a signed-in super admin.
    const currentAdmin = tokenAdmin ? await getSuperAdminId() : null;
    return NextResponse.json({ success: true, isAuthorized: Boolean(tokenAdmin && tokenAdmin === currentAdmin) });
  } catch (error) {
    console.error('Admin status check error:', error);
    return NextResponse.json({ success: false, isAuthorized: false });
  }
}
