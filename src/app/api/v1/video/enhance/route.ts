import { NextResponse, type NextRequest } from 'next/server';
import crypto from 'node:crypto';
import { z } from 'zod';
import { getSession } from '@/server/auth/session';
import { clientIp, recentFailures, recordAttempt } from '@/server/auth/rate-limit';
import { executeVideoEnhance } from '@/server/providers/ai/direct-fitment-engine';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * Masters one finished tuned frame for the video edit (sharper, relit, graded), keeping the
 * car, parts and angle identical. No credits: the user already paid for the render itself;
 * abuse is held back by a per-user, database-backed rate limit (shared by every server instance). Without an AI key the client keeps its own
 * frames and the reel still renders with the built-in grade.
 */

// Hosting platforms cut request bodies at ~4.5 MB, so a bigger limit would never be reached.
const MAX_IMAGE_CHARS = 4_200_000;
const PER_MINUTE = 12;

const schema = z
  .object({
    image: z.string().min(16).max(MAX_IMAGE_CHARS),
    angleId: z.string().trim().max(40).optional(),
    partNames: z.array(z.string().trim().min(1).max(160)).max(6).optional(),
  })
  .strict();

const meta = () => ({ requestId: crypto.randomUUID(), timestamp: new Date().toISOString() });

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ success: false, code: 'UNAUTHENTICATED', error: 'Kirish talab qilinadi', meta: meta() }, { status: 401 });
  }
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ success: false, code: 'INVALID_INPUT', error: 'Ma’lumotlar noto‘g‘ri', meta: meta() }, { status: 400 });
  }
  const used = await recentFailures('login_key', session.userId, 'video_enhance', 60_000, true);
  if (used >= PER_MINUTE) {
    return NextResponse.json({ success: false, code: 'RATE_LIMITED', error: 'Juda ko‘p so‘rov', meta: meta() }, { status: 429 });
  }
  await recordAttempt('video_enhance', session.userId, clientIp(request), true);
  try {
    const result = await executeVideoEnhance(parsed.data);
    return NextResponse.json({
      success: true,
      enhanced: Boolean(result.image),
      image: result.image,
      providerUsed: result.providerUsed,
      outcome: result.outcome ?? null,
      meta: meta(),
    });
  } catch (err) {
    console.error('video enhance failed:', err);
    return NextResponse.json({ success: true, enhanced: false, image: null, providerUsed: 'none', outcome: 'failed', meta: meta() });
  }
}
