import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/server';
import { adminLiveOr401 } from '@/server/admin';

export const dynamic = 'force-dynamic';

/** Short-lived signed link to one receipt image, created only when the admin opens the order. */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if ('response' in (await adminLiveOr401(request))) {
    return NextResponse.json({ success: false, code: 'ADMIN_SESSION_REQUIRED', error: 'Unauthorized' }, { status: 401 });
  }
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) return NextResponse.json({ success: false, code: 'NOT_FOUND', error: 'Not found' }, { status: 404 });
  const db = createAdminClient();
  const { data: b } = await db.from('bookings').select('receipt_path').eq('id', id).maybeSingle();
  if (!b?.receipt_path) return NextResponse.json({ success: false, code: 'NOT_FOUND', error: 'Not found' }, { status: 404 });
  const { data } = await db.storage.from('receipts').createSignedUrl(b.receipt_path as string, 300);
  if (!data?.signedUrl) return NextResponse.json({ success: false, code: 'INTERNAL', error: 'Server error' }, { status: 500 });
  return NextResponse.json({ success: true, url: data.signedUrl });
}
