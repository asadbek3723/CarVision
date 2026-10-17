import { NextRequest, NextResponse } from 'next/server';
import { getCameraSession, updateCameraSession } from '@/lib/camera-session';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;
    const session = getCameraSession(sessionId);

    if (!session) {
      return NextResponse.json({ success: false, error: 'Session not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, session });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Internal error' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;
    const body = await request.json();

    const { status, imageUrl, angleId } = body;

    const existing = getCameraSession(sessionId);
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Session not found' }, { status: 404 });
    }

    const updates: Parameters<typeof updateCameraSession>[1] = {};
    if (status) updates.status = status;
    if (imageUrl) updates.imageUrl = imageUrl;
    if (angleId && imageUrl) {
      updates.angles = {
        ...(existing.angles || {}),
        [angleId]: imageUrl,
      };
    }

    const updated = updateCameraSession(sessionId, updates);

    return NextResponse.json({ success: true, session: updated });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Internal error' },
      { status: 500 }
    );
  }
}
