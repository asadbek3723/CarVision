import { NextResponse, type NextRequest } from 'next/server';
import crypto from 'node:crypto';
import { z } from 'zod';
import { getSession } from '@/server/auth/session';
import { executeVideoEnhance } from '@/server/providers/ai/direct-fitment-engine';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * Masters one finished tuned frame for the video edit (sharper, relit, graded), keeping the
 * car, parts and angle identical. No credits: the user already paid for the render itself;
 * abuse is held back by a per-user rate limit. Without an AI key the client keeps its own
 * frames and the reel still renders with the built-in grade.
 */

const MAX_IMAGE_CHARS = 8_000_000;
const PER_MINUTE = 12;
const IN_FLIGHT = 3;

const schema = z
  .object({
    image: z.string().min(16).max(MAX_IMAGE_CHARS),
    angleId: z.string().trim().max(40).optional(),
    partNames: z.array(z.string().trim().min(1).max(160)).max(6).optional(),
  })
  .strict();

// Per-instance limiter (serverless instances each keep their own window; good enough for a free helper)
const usage = new Map<string, { hits: number[]; running: number }>();

function take(userId: string): boolean {
  const now = Date.now();
  const u = usage.get(userId) ?? { hits: [], running: 0 };
  u.hits = u.hits.filter((t) => now - t < 60_000);
  if (u.hits.length >= PER_MINUTE || u.running >= IN_FLIGHT) {
    usage.set(userId, u);
    return false;
  }
  u.hits.push(now);
  u.running += 1;
  usage.set(userId, u);
  return true;
}

function release(userId: string) {
  const u = usage.get(userId);
  if (u) u.running = Math.max(0, u.running - 1);
}

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
  if (!take(session.userId)) {
    return NextResponse.json({ success: false, code: 'RATE_LIMITED', error: 'Juda ko‘p so‘rov', meta: meta() }, { status: 429 });
  }
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
  } finally {
    release(session.userId);
  }
}
