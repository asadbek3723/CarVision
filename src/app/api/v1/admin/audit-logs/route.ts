import { NextResponse, type NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { verifyAdminSessionToken, ADMIN_COOKIE_NAME } from '@/lib/admin-auth';

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get(ADMIN_COOKIE_NAME)?.value;
    if (!verifyAdminSessionToken(token)) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createAdminClient();
    const { data: logs, error } = await supabase
      .from('login_attempts')
      .select('id, kind, login_key, ip, success, created_at')
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    const formatted = (logs || []).map((l) => {
      const isFailed = !l.success;
      let action = 'ADMIN_PIN_VERIFIED';
      let admin = 'kursant410@gmail.com';
      let details = 'Master PIN muvaffaqiyatli tasdiqlandi. HMAC sessiyasi berildi.';

      if (l.login_key.includes('admin_pin_failed') || isFailed) {
        action = 'RATE_LIMIT_SHIELD';
        admin = 'Tizim Xavfsizlik Qo‘riqchisi';
        details = 'Begona IP orqali noto‘g‘ri PIN kiritishga urinish to‘xtatildi';
      } else if (l.login_key.includes('studio_session')) {
        action = 'STUDIO_SESSION_AUTH';
        admin = l.login_key.replace('studio_session:', '');
        details = 'Atelye vakili autentifikatsiyadan muvaffaqiyatli o‘tdi';
      } else if (l.kind === 'register') {
        action = 'STUDIO_REGISTRATION';
        admin = l.login_key.replace('studio_register:', '');
        details = 'Yangi avtoservis yoki atelye tizimdan ro‘yxatdan o‘tdi';
      }

      const date = new Date(l.created_at);
      const timeStr = date.toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' });
      const dateStr = date.toLocaleDateString('uz-UZ', { month: 'short', day: 'numeric' });

      return {
        id: `log-${l.id}`,
        action,
        admin,
        ip: l.ip || '127.0.0.1',
        timestamp: `${dateStr}, ${timeStr}`,
        status: l.success ? ('SUCCESS' as const) : ('BLOCKED' as const),
        details,
      };
    });

    return NextResponse.json({
      success: true,
      logs: formatted,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
