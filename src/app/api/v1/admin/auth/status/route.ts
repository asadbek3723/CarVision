import { NextResponse, type NextRequest } from 'next/server';
import { verifyAdminSessionToken, ADMIN_COOKIE_NAME } from '@/lib/admin-auth';

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get(ADMIN_COOKIE_NAME)?.value;
    const isAuthorized = verifyAdminSessionToken(token);

    return NextResponse.json({
      success: true,
      isAuthorized,
    });
  } catch (error) {
    console.error('Admin status check error:', error);
    return NextResponse.json({
      success: false,
      isAuthorized: false,
    });
  }
}
