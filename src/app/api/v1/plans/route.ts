import { NextResponse } from 'next/server';
import { listActivePlans } from '@/server/plans';

export const dynamic = 'force-dynamic';

/** Public plan list (from the database, so the admin can change it without a deploy). */
export async function GET() {
  try {
    return NextResponse.json({ success: true, plans: await listActivePlans() });
  } catch (err) {
    console.error('plans error:', err);
    return NextResponse.json({ success: false, code: 'INTERNAL', error: 'Server error' }, { status: 500 });
  }
}
