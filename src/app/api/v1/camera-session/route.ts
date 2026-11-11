import { NextResponse, type NextRequest } from 'next/server';
import { createCameraSession } from '@/lib/camera-session';
import { getSession } from '@/server/auth/session';
import { clientIp, recentFailures, recordAttempt } from '@/server/auth/rate-limit';

/** Starts a phone hand-off session. `{ "kind": "product" }` requires a signed-in workshop. */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => ({}))) as { kind?: string };
    const kind = body.kind === 'product' ? 'product' : 'car';

    let userId: string | undefined;
    if (kind === 'product') {
      const session = await getSession();
      if (!session) return NextResponse.json({ success: false, code: 'UNAUTHENTICATED', error: 'Kirish talab qilinadi' }, { status: 401 });
      userId = session.userId;
    }

    // Each session can hold several MB of photos in the database: anonymous visitors get fewer.
    const ip = clientIp(request);
    const perHour = userId ? 40 : 12;
    if ((await recentFailures('ip', ip, 'camera_session', 60 * 60 * 1000, true)) >= perHour) {
      return NextResponse.json({ success: false, code: 'RATE_LIMITED', error: 'Juda ko‘p so‘rov' }, { status: 429 });
    }
    await recordAttempt('camera_session', 'create', ip, true);

    const session = await createCameraSession(kind, userId);
    return NextResponse.json({ success: true, session });
  } catch (error) {
    console.error('camera-session create error:', error);
    return NextResponse.json({ success: false, code: 'SESSION_FAILED', error: 'Sessiya yaratib bo‘lmadi' }, { status: 500 });
  }
}
