import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/server';
import {
  checkPinRateLimit,
  recordFailedPinAttempt,
  clearPinRateLimit,
  verifyPinConstantTime,
  createAdminSessionToken,
  getAdminCookieOptions,
} from '@/lib/admin-auth';

const verifyPinSchema = z.object({
  pin: z.string().min(4).max(8),
});

export async function POST(request: NextRequest) {
  try {
    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request.headers.get('x-real-ip') ||
      '127.0.0.1';

    // 1. Check rate limit
    const rateCheck = checkPinRateLimit(ip);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: `Ko'p marta xato terildi. Iltimos, ${rateCheck.retryAfterSeconds} soniyadan keyin qayta urinib ko'ring.`,
            retryAfterSeconds: rateCheck.retryAfterSeconds,
          },
        },
        { status: 429 }
      );
    }

    // 2. Validate input format
    const body = await request.json().catch(() => ({}));
    const validated = verifyPinSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_INPUT',
            message: 'PIN kod formati noto‘g‘ri.',
          },
        },
        { status: 400 }
      );
    }

    const { pin } = validated.data;

    // 3. Constant-time PIN verification on server
    const isMatch = verifyPinConstantTime(pin);

    if (!isMatch) {
      const failure = recordFailedPinAttempt(ip);

      // Log failed attempt to Supabase
      try {
        const supabase = createAdminClient();
        await supabase.from('login_attempts').insert([
          {
            kind: 'login',
            login_key: 'admin_pin_failed:invalid_pin',
            ip,
            success: false,
          },
        ]);
      } catch {
        // Non-blocking log
      }

      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_PIN',
            message: failure.isLocked
              ? `Xavfsizlik tizimi bloklandi. ${failure.retryAfterSeconds} soniyadan so'ng urinib ko'ring.`
              : `PIN kod noto‘g‘ri. Qolgan urinishlar soni: ${failure.remainingAttempts}`,
            remainingAttempts: failure.remainingAttempts,
            retryAfterSeconds: failure.retryAfterSeconds,
          },
        },
        { status: 401 }
      );
    }

    // 4. Verification successful - clear rate limit
    clearPinRateLimit(ip);

    // Log successful attempt to Supabase
    try {
      const supabase = createAdminClient();
      await supabase.from('login_attempts').insert([
        {
          kind: 'login',
          login_key: 'admin_pin:kursant410@gmail.com',
          ip,
          success: true,
        },
      ]);
    } catch {
      // Non-blocking log
    }

    // 5. Issue signed admin session token
    const token = createAdminSessionToken();
    const cookieOptions = getAdminCookieOptions();

    const response = NextResponse.json({
      success: true,
      message: 'Admin xavfsizlik ruxsati berildi.',
    });

    response.cookies.set({
      name: cookieOptions.name,
      value: token,
      httpOnly: cookieOptions.httpOnly,
      secure: cookieOptions.secure,
      sameSite: cookieOptions.sameSite,
      path: cookieOptions.path,
      maxAge: cookieOptions.maxAge,
    });

    return response;
  } catch (error) {
    console.error('Admin PIN verification error:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Serverda xatolik yuz berdi.',
        },
      },
      { status: 500 }
    );
  }
}
