import { NextRequest, NextResponse } from 'next/server';
import { MAX_SESSION_UPLOADS, getCameraSession, getSessionRow, isValidSessionId, updateCameraSession } from '@/lib/camera-session';

export const dynamic = 'force-dynamic';

const MAX_DATA_URL_CHARS = 4_600_000; // ~3.4MB of image data
const IMAGE_DATA_URL = /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/;

export async function GET(_request: NextRequest, { params }: { params: Promise<{ sessionId: string }> }) {
  try {
    const { sessionId } = await params;
    const session = await getCameraSession(sessionId);
    if (!session) return NextResponse.json({ success: false, code: 'NOT_FOUND', error: 'Session not found' }, { status: 404 });
    return NextResponse.json({ success: true, session });
  } catch (error) {
    console.error('camera-session get error:', error);
    return NextResponse.json({ success: false, code: 'INTERNAL', error: 'Internal error' }, { status: 500 });
  }
}

/** The phone posts status changes and captured photos. The session id is an unguessable capability. */
export async function POST(request: NextRequest, { params }: { params: Promise<{ sessionId: string }> }) {
  try {
    const { sessionId } = await params;
    if (!isValidSessionId(sessionId)) return NextResponse.json({ success: false, code: 'NOT_FOUND', error: 'Session not found' }, { status: 404 });
    const body = (await request.json().catch(() => null)) as { status?: string; imageUrl?: string; angleId?: number } | null;
    if (!body) return NextResponse.json({ success: false, code: 'INVALID_INPUT', error: 'Invalid body' }, { status: 400 });

    const existing = await getSessionRow(sessionId);
    if (!existing) return NextResponse.json({ success: false, code: 'NOT_FOUND', error: 'Session not found' }, { status: 404 });

    const updates: Parameters<typeof updateCameraSession>[1] = {};
    if (body.status === 'waiting' || body.status === 'connected' || body.status === 'captured') updates.status = body.status;

    if (typeof body.imageUrl === 'string' && body.imageUrl) {
      if (body.imageUrl.length > MAX_DATA_URL_CHARS || !IMAGE_DATA_URL.test(body.imageUrl)) {
        return NextResponse.json({ success: false, code: 'BAD_IMAGE', error: 'Rasm formati yoki hajmi noto‘g‘ri' }, { status: 400 });
      }
      if (existing.uploads >= MAX_SESSION_UPLOADS) {
        return NextResponse.json({ success: false, code: 'SESSION_LIMIT', error: 'Sessiya limiti tugadi' }, { status: 429 });
      }
      updates.imageUrl = body.imageUrl;
      if (typeof body.angleId === 'number' && Number.isInteger(body.angleId) && body.angleId >= 0 && body.angleId <= 20) {
        updates.angleId = body.angleId;
      }
    }

    const updated = await updateCameraSession(sessionId, updates);
    if (!updated) return NextResponse.json({ success: false, code: 'NOT_FOUND', error: 'Session not found' }, { status: 404 });
    return NextResponse.json({ success: true, session: updated });
  } catch (error) {
    console.error('camera-session post error:', error);
    return NextResponse.json({ success: false, code: 'INTERNAL', error: 'Internal error' }, { status: 500 });
  }
}
