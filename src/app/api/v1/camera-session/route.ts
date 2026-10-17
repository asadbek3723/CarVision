import { NextResponse } from 'next/server';
import { createCameraSession } from '@/lib/camera-session';

export async function POST() {
  try {
    const session = createCameraSession();
    return NextResponse.json({ success: true, session });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to create session' },
      { status: 500 }
    );
  }
}
